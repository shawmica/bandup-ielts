/*
 * BandUp scoring engine.
 *
 *  - Reading / Listening: REAL auto-scoring against a fixed answer key (no AI).
 *  - Writing / Speaking:  SIMULATED AI that mirrors a production pipeline:
 *        1 Measure  - objective metrics computed from the learner's text (real code)
 *        2 Judge    - descriptor-style statements chosen from a pre-written bank
 *                     (stands in for a language model judging against band descriptors)
 *        3 Combine  - weighted rules turn metrics + judgements into four criterion bands
 *        4 Calibrate- the CALIBRATION table below compares outputs with reference ratings
 *
 * Runs in the browser (window.Engine) and in Node (require) for the calibration script.
 */
(function (root) {
  'use strict';

  // ----------------------------------------------------------------- band tables
  // Official anchor points (ielts.org "IELTS scoring in detail", accessed 21 Oct 2026):
  // the average raw score out of 40 needed for each whole band. Rows marked
  // official:false are the prototype's own linear interpolation / extrapolation.
  const BAND_ANCHORS = {
    listening: [[16, 5, true], [23, 6, true], [30, 7, true], [35, 8, true], [40, 9, false]],
    reading_academic: [[15, 5, true], [23, 6, true], [30, 7, true], [35, 8, true], [40, 9, false]],
    reading_general: [[15, 4, true], [23, 5, true], [30, 6, true], [35, 7, true], [40, 9, false]]
  };

  function rawToBand(raw, table) {
    const a = BAND_ANCHORS[table];
    if (!a) throw new Error('Unknown table ' + table);
    if (raw <= 0) return { band: 0, official: false };
    const top = a[a.length - 1];
    if (raw >= top[0]) return { band: top[1], official: top[2] };
    // below the lowest anchor: drop half a band for every 3 marks
    if (raw < a[0][0]) {
      const steps = Math.ceil((a[0][0] - raw) / 3);
      return { band: Math.max(1, a[0][1] - steps * 0.5), official: false };
    }
    for (let i = 0; i < a.length - 1; i++) {
      const [r0, b0, off0] = a[i];
      const [r1, b1] = a[i + 1];
      if (raw >= r0 && raw < r1) {
        if (raw === r0) return { band: b0, official: off0 };
        const halfSteps = Math.floor(((raw - r0) / (r1 - r0)) * (b1 - b0) * 2);
        return { band: b0 + halfSteps / 2, official: false };
      }
    }
    return { band: top[1], official: false };
  }

  // IELTS overall rounding: .25 -> up to .5, .75 -> up to next whole, otherwise nearest half.
  function roundHalf(x) { return Math.round(x * 2 + 1e-9) / 2; }

  function overallBand(bands) {
    const vals = ['listening', 'reading', 'writing', 'speaking'].map(k => bands[k]);
    if (vals.some(v => typeof v !== 'number')) return null;
    const avg = vals.reduce((s, v) => s + v, 0) / 4;
    return { average: avg, band: roundHalf(avg) };
  }

  // ----------------------------------------------------------------- text helpers
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

  function normalise(s) {
    return String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9.'\/+ -]/g, ' ')
      .replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '').replace(/\.$/, '');
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  // ----------------------------------------------------------------- objective scoring
  // q: {type, answer, numeric?}; response: string or index
  function checkAnswer(q, response, maxWords) {
    if (q.type === 'MCQ') return { correct: response === q.answer, errorType: response === undefined || response === null ? 'blank' : (response === q.answer ? null : 'wrong') };
    if (q.type === 'TFNG') return { correct: response === q.answer, errorType: !response ? 'blank' : (response === q.answer ? null : 'wrong') };
    // gap-fill
    let given = normalise(response);
    if (!given) return { correct: false, errorType: 'blank' };
    if (maxWords && given.split(' ').length > maxWords) return { correct: false, errorType: 'format', note: 'More than ' + maxWords + ' words' };
    let answers = q.answer.map(normalise);
    if (q.numeric) {
      given = given.replace(/^rs\.? ?/, '').replace(/[ ,.]/g, '');
      answers = answers.map(a => a.replace(/[ ,.]/g, ''));
    }
    if (answers.includes(given)) return { correct: true, errorType: null };
    const near = answers.some(a => !q.numeric && levenshtein(given, a) <= (a.length > 5 ? 2 : 1));
    if (near) return { correct: false, errorType: 'spelling', note: 'Close, but the spelling must be exact' };
    if (q.numeric && /[a-z]/.test(given)) return { correct: false, errorType: 'format', note: 'Write the answer as digits' };
    return { correct: false, errorType: 'wrong' };
  }

  function scoreObjective(questions, responses, table, opts = {}) {
    const items = questions.map(q => {
      const r = checkAnswer(q, responses[q.n], opts.maxWords && q.type === 'COMPLETION' ? opts.maxWords : null);
      return Object.assign({ n: q.n, type: q.type, lo: q.lo, given: responses[q.n] }, r);
    });
    const raw = items.filter(i => i.correct).length;
    const total = questions.length;
    const equiv40 = Math.round((raw / total) * 40);
    const conv = rawToBand(equiv40, table);
    const byType = {};
    items.forEach(i => {
      byType[i.type] = byType[i.type] || { correct: 0, total: 0 };
      byType[i.type].total++; if (i.correct) byType[i.type].correct++;
    });
    const errors = { spelling: 0, format: 0, blank: 0, wrong: 0 };
    items.forEach(i => { if (i.errorType) errors[i.errorType]++; });
    return { raw, total, equiv40, band: conv.band, bandOfficial: conv.official, table, byType, errors, items, scaled: total !== 40 };
  }

  // ----------------------------------------------------------------- MEASURE (text)
  const LINKERS = ['on the other hand', 'on the one hand', 'in addition', 'for example', 'for instance', 'as a result', 'in conclusion',
    'to sum up', 'in contrast', 'by contrast', 'as well as', 'even though', 'in other words', 'looking back', 'after that',
    'overall', 'however', 'moreover', 'furthermore', 'therefore', 'although', 'whereas', 'firstly', 'secondly', 'finally',
    'consequently', 'nevertheless', 'nonetheless', 'besides', 'similarly', 'admittedly', 'meanwhile', 'thus', 'because', 'since', 'while',
    'also', 'then', 'but', 'so'];
  const SUPPORT = ['for example', 'for instance', 'such as', 'because', 'since', 'as a result', 'this means', 'which means', 'so that',
    'in particular', 'especially', 'which suggests', 'this is why', 'the reason'];
  const REFERENCING = ['this', 'these', 'those', 'it', 'they', 'them', 'its', 'their', 'which', 'such', 'former', 'latter', 'whose'];
  const SUBORDINATORS = /\b(because|although|though|while|whereas|when|which|who|whom|whose|that|if|unless|since|until|where|whether|as soon as|so that|even though)\b/i;
  const MISSPELLINGS = ['recieve', 'beleive', 'goverment', 'enviroment', 'wich', 'becouse', 'becuase', 'untill', 'alot', 'definately', 'occured',
    'seperate', 'tommorow', 'accomodation', 'dissapoint', 'begining', 'freind', 'studing', 'writting', 'thier', 'truely', 'arguement',
    'knowlege', 'oppurtunity', 'adress', 'languge', 'lerning', 'tution', 'regulary', 'responsability', 'succesful', 'beautifull', 'peoples',
    'informations', 'advices', 'teh', 'hapen', 'buisness', 'excercise', 'wether', 'usefull', 'carefull'];
  // Common learner error patterns (proxy for grammatical accuracy). label shown to learner.
  const ERROR_PATTERNS = [
    [/\bmore (better|worse|easier|cheaper|bigger)\b/gi, 'double comparative ("more better")'],
    [/\bmost (best|worst)\b/gi, 'double superlative'],
    [/(^|[.!?]\s+|\s)i(\s)/g, 'lower-case "i"'],
    [/\b(apps|people|students|teachers|they|we|learners) (is|was|has)\b/gi, 'subject-verb agreement (plural + is/was/has)'],
    [/\b(he|she|it|student|teacher|app|my friend|my father|my teacher) (go|have|do|make|learn|use|need|want|take|help|study|start)\b/gi, 'subject-verb agreement (missing -s)'],
    [/\b(can|could|should|will|must|would) (learns|uses|goes|to)\b/gi, 'modal verb form'],
    [/\b(can|could|should|will|must) be (use|do|make|give|learn|teach|see)\b/gi, 'passive form (be + past participle)'],
    [/\bdidn'?t (went|saw|learned|learnt|took|made|came)\b/gi, 'past form after "didn\'t"'],
    [/\ba (apple|app|hour|easy|important|interesting|example|online|old|area)\b/gi, '"a" before a vowel sound'],
    [/\b(\w+) \1\b/gi, 'repeated word'],
    [/\bfor learn\b/gi, '"for learn" (use "to learn" / "for learning")'],
    [/\b(when|after) i am (\w+ )?(\d+|ten|eight|young)/gi, 'tense (past time with "am")'],
    [/\bafter (two|three|few) year\b/gi, 'plural after number'],
    [/\b(don'?t|didn'?t) like (put|do|go|swim)\b/gi, 'verb pattern after "like"'],
    [/\bstart learn\b/gi, 'verb pattern ("start learning")'],
    [/\bevery where\b/gi, 'spelling ("everywhere")'],
    [/\b(is|are|was|were) (increase|decrease|rise|grow|study|learn|use|go|help)\b/gi, '"be" + base verb (e.g. "is increase")'],
    [/\ball (group|student|people is)\b/gi, 'plural after "all"'],
    [/\b(he|she) (take|help|go)\b/gi, 'subject-verb agreement (missing -s)']
  ];
  const FILLERS = /\b(um+|uh+|er+|erm+|ah+|hmm+)\b|,\s*like,|\byou know\b|\bi mean\b/gi;

  function tokens(text) { return (String(text).match(/[A-Za-z0-9]+(?:['’.\-+][A-Za-z0-9]+)*/g) || []); }
  function alphaTokens(text) { return (String(text).toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g) || []); }
  function sentences(text) {
    return String(text).replace(/\.\.\./g, ' ').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => tokens(s).length >= 2);
  }
  function paragraphs(text) { return String(text).split(/\n+/).map(s => s.trim()).filter(s => tokens(s).length >= 8); }
  function mattr(words, win = 40) {
    if (words.length === 0) return 0;
    if (words.length <= win) return new Set(words).size / words.length;
    let total = 0, n = 0;
    for (let i = 0; i + win <= words.length; i++) { total += new Set(words.slice(i, i + win)).size / win; n++; }
    return total / n;
  }
  function countPhrases(lower, list) {
    let rest = ' ' + lower.replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const found = {};
    list.forEach(p => {
      const re = new RegExp(' ' + p + ' ', 'g');
      const m = rest.match(re);
      if (m) { found[p] = m.length; rest = rest.replace(re, ' # '); }
    });
    return found;
  }
  function coverageOf(lower, groups) {
    if (!groups || !groups.length) return { ratio: 1, hit: [], missed: [] };
    const hit = [], missed = [];
    groups.forEach(g => (g.terms.some(t => lower.includes(t)) ? hit : missed).push(g.label));
    return { ratio: hit.length / groups.length, hit, missed };
  }

  function measureText(text) {
    const toks = tokens(text);
    const words = alphaTokens(text);
    const lower = String(text).toLowerCase();
    const sents = sentences(text);
    const paras = paragraphs(text);
    const linkers = countPhrases(lower, LINKERS);
    const linkerTotal = Object.values(linkers).reduce((a, b) => a + b, 0);
    const refs = words.filter(w => REFERENCING.includes(w)).length;
    const complex = sents.filter(s => SUBORDINATORS.test(s) || /,\s*(which|who)\b/i.test(s)).length;
    const spelling = words.filter(w => MISSPELLINGS.includes(w));
    const errors = [];
    ERROR_PATTERNS.forEach(([re, label]) => {
      const m = String(text).match(re);
      if (m) errors.push({ label, count: m.length, example: m[0].trim() });
    });
    const errorCount = errors.reduce((a, e) => a + e.count, 0);
    const commas = (String(text).match(/,/g) || []).length;
    const wc = toks.length;
    return {
      wordCount: wc,
      sentenceCount: sents.length,
      avgSentenceLength: sents.length ? wc / sents.length : wc,
      paragraphCount: paras.length,
      lexicalDiversity: mattr(words, 50),
      sophistication: words.length ? new Set(words.filter(w => w.replace(/['-]/g, '').length >= 7)).size / words.length : 0,
      supportDistinct: Object.keys(countPhrases(lower, SUPPORT)).length,
      longWordRatio: words.length ? words.filter(w => w.replace(/['-]/g, '').length >= 7).length / words.length : 0,
      linkerTotal, linkerDistinct: Object.keys(linkers).length, linkers,
      linkerPer100: wc ? (linkerTotal / wc) * 100 : 0,
      referencingPer100: wc ? (refs / wc) * 100 : 0,
      complexRatio: sents.length ? complex / sents.length : 0,
      commasPerSentence: sents.length ? commas / sents.length : 0,
      spellingErrors: spelling, errors, errorCount,
      errorsPer100: wc ? (errorCount + spelling.length) / wc * 100 : 0,
      lower
    };
  }

  // ----------------------------------------------------------------- JUDGE bank
  // Short descriptor-style statements written by the group in plain language.
  // They paraphrase the *idea* of each public band level; they are not the official wording.
  const DESCRIPTOR_BANK = {
    TA: {
      label: 'Task Achievement / Response',
      levels: { 4: 'Responds to the task only partly; the main idea or format is unclear or off-topic in places.',
        5: 'Covers the task in part; ideas are limited or not fully developed, and the format may be inappropriate.',
        6: 'Covers all parts of the task, although some are developed more fully than others.',
        7: 'Covers all parts of the task with a clear position or overview and well-supported main ideas.',
        8: 'Fully covers the task with a clear, well-developed and well-supported response.' } },
    CC: {
      label: 'Coherence and Cohesion',
      levels: { 4: 'Ideas are not arranged clearly; linking is basic, repetitive or missing.',
        5: 'Some organisation, but progression is not always clear and linking may be overused or faulty.',
        6: 'Ideas are arranged logically with linking devices, though some linking is mechanical.',
        7: 'Ideas progress clearly; a range of linking devices is used, with clear paragraphing.',
        8: 'Sequencing is smooth and paragraphing is skilful; linking draws little attention to itself.' } },
    LR: {
      label: 'Lexical Resource',
      levels: { 4: 'Basic vocabulary used repetitively; errors in word choice or spelling may block meaning.',
        5: 'Limited range, just enough for the task; noticeable spelling or word-formation errors.',
        6: 'Adequate range for the task, with some attempts at less common words and some errors.',
        7: 'Enough range to be flexible and precise; some less common words and collocations.',
        8: 'Wide range used fluently and precisely; only occasional slips.' } },
    GRA: {
      label: 'Grammatical Range and Accuracy',
      levels: { 4: 'Mostly simple sentences; frequent errors that sometimes make meaning hard to follow.',
        5: 'Limited range of structures; complex sentences are attempted but often contain errors.',
        6: 'A mix of simple and complex sentences; some errors, though they rarely reduce clarity.',
        7: 'A variety of complex structures; many sentences are error-free.',
        8: 'Wide range of structures; most sentences are error-free.' } },
    FC: {
      label: 'Fluency and Coherence',
      levels: { 4: 'Frequent pauses and repetition; simple linking only.',
        5: 'Keeps going but relies on repetition, hesitation and slow speech.',
        6: 'Willing to speak at length, with some hesitation and occasional loss of coherence.',
        7: 'Speaks at length without noticeable effort; uses a range of discourse markers.',
        8: 'Fluent with only occasional hesitation; develops topics coherently.' } },
    PR: {
      label: 'Pronunciation',
      levels: { 4: 'Limited range of features; mispronunciations cause frequent difficulty.',
        5: 'Some features controlled; mispronunciations sometimes reduce clarity.',
        6: 'Generally understood, with some features used effectively.',
        7: 'Easy to understand; a range of features with only occasional lapses.',
        8: 'Easy to understand throughout; accent has little effect.' } }
  };
  DESCRIPTOR_BANK.SLR = Object.assign({}, DESCRIPTOR_BANK.LR);
  DESCRIPTOR_BANK.SGRA = Object.assign({}, DESCRIPTOR_BANK.GRA);

  function descriptorFor(code, band) {
    const lv = DESCRIPTOR_BANK[code].levels;
    const b = Math.max(4, Math.min(8, Math.floor(band)));
    return lv[b];
  }

  // ----------------------------------------------------------------- WRITING pipeline
  // task: content.WRITING[key]
  function scoreWriting(text, task) {
    const m = measureText(text);
    const steps = [];
    if (m.wordCount < 40) {
      return { status: 'error', message: 'Write at least 40 words so the feedback can be useful. You have written ' + m.wordCount + '.', metrics: m };
    }
    // ---- 1 MEASURE (done above) ----
    const cov = coverageOf(m.lower, task.coverage);
    const hasPosition = task.position.test(text);
    const r = m.wordCount / task.min;
    const isT2 = task.task === 2;
    steps.push('measure');

    // ---- 3 COMBINE: weighted rules -> criterion proxy scores ----
    // Task-specific anchors: Task 1 texts are shorter and number-heavy, so lexical
    // measures sit lower than in Task 2 at the same level (set during calibration).
    const A = isT2 ? { divLo: 0.78, divHi: 0.92, sLo: 0.15, sHi: 0.35 } : { divLo: 0.55, divHi: 0.82, sLo: 0.06, sHi: 0.20 };
    const divScore = clamp((m.lexicalDiversity - A.divLo) / (A.divHi - A.divLo));
    const sophScore = clamp((m.sophistication - A.sLo) / (A.sHi - A.sLo));
    const complexScore = clamp(m.complexRatio / 0.6);
    const errScore = clamp(1 - m.errorsPer100 / 4);
    const devScore = clamp(m.supportDistinct / 4);

    let TA = 2 + 1.5 * cov.ratio + (hasPosition ? 1.5 : 0) + 1.5 * Math.min(r, 1) + 1.5 * devScore;
    if (r < 0.9) TA = Math.min(TA, 5); else if (r < 1) TA = Math.min(TA, 6);

    const paraTarget = isT2 ? 4 : 3;
    const paraScore = m.paragraphCount <= 1 ? 0 : Math.min(m.paragraphCount, paraTarget) / paraTarget;
    const d = m.linkerPer100;
    const densityScore = d < 2 ? d / 2 : d <= 7 ? 1 : clamp(1 - (d - 7) / 5);
    const varietyScore = Math.min(m.linkerDistinct, 8) / 8;
    const refScore = clamp(m.referencingPer100 / 3);
    let CC = 2 + 2 * paraScore + 1.5 * varietyScore + 1 * densityScore + 1 * refScore;
    if (m.paragraphCount <= 1) CC = Math.min(CC, 5);

    let LR = 3.5 + 2.5 * divScore + 2.5 * sophScore - Math.min(m.spellingErrors.length, 3) * 0.4;
    if (m.wordCount < 120) LR -= 0.5;

    const asl = m.avgSentenceLength;
    const lenScore = asl >= 14 && asl <= 28 ? 1 : asl < 14 ? clamp((asl - 7) / 7) : clamp(1 - (asl - 28) / 10);
    const GRA = 2.5 + 1.5 * complexScore + 1.5 * lenScore + 2.5 * errScore;

    // ---- 2 JUDGE (holistic index): stands in for a language model's overall judgement.
    // Blended 50/50 with each criterion proxy, the way a production system would combine
    // model judgements with measured features.
    const judge = 2.5 + 2 * errScore + 1.5 * sophScore + 1.5 * divScore + 1 * complexScore;
    const blend = x => 0.5 * x + 0.5 * judge;
    const raw = { TA: blend(TA), CC: blend(CC), LR: blend(LR), GRA: blend(GRA) };
    const proxies = { TA, CC, LR, GRA };
    const bands = {};
    Object.keys(raw).forEach(k => { bands[k] = Math.max(1, Math.min(9, Math.round(raw[k]))); });
    const band = roundHalf((bands.TA + bands.CC + bands.LR + bands.GRA) / 4);
    steps.push('judge', 'combine');

    // ---- 2 JUDGE: descriptor statement + targeted feedback from the bank ----
    const fb = { TA: [], CC: [], LR: [], GRA: [] };
    if (r < 1) fb.TA.push({ kind: 'fix', text: `Under the minimum: ${m.wordCount}/${task.min} words. Answers under the limit lose marks for Task ${isT2 ? 'Response' : 'Achievement'}.` });
    if (!hasPosition) fb.TA.push({ kind: 'fix', text: `Add ${task.positionLabel}.` });
    else fb.TA.push({ kind: 'good', text: isT2 ? 'Your position is stated clearly.' : 'You included ' + task.positionLabel.replace(/^a |^an /, 'a ') + '.' });
    if (cov.missed.length) fb.TA.push({ kind: 'fix', text: 'Not covered yet: ' + cov.missed.join('; ') + '.' });
    if (m.paragraphCount <= 1) fb.CC.push({ kind: 'fix', text: 'Your answer is one block of text. Use separate paragraphs, one main idea in each.' });
    else if (m.paragraphCount < paraTarget) fb.CC.push({ kind: 'tip', text: `You have ${m.paragraphCount} paragraphs. Aim for ${paraTarget}${isT2 ? ': introduction, two body paragraphs and a conclusion' : ''}.` });
    else fb.CC.push({ kind: 'good', text: `Clear paragraphing (${m.paragraphCount} paragraphs).` });
    if (d > 7) fb.CC.push({ kind: 'fix', text: `Linking words are overused (${d.toFixed(1)} per 100 words). Let some sentences connect through reference words such as "this" or "these".` });
    else if (m.linkerDistinct < 4) fb.CC.push({ kind: 'tip', text: `Only ${m.linkerDistinct} different linking words. Try "however", "as a result", "for instance".` });
    else fb.CC.push({ kind: 'good', text: `Good range of linking words (${m.linkerDistinct} different).` });
    if (divScore < 0.4) fb.LR.push({ kind: 'fix', text: `Many words are repeated (diversity ${m.lexicalDiversity.toFixed(2)}). Paraphrase key words instead of repeating them.` });
    else fb.LR.push({ kind: 'good', text: `Varied vocabulary (diversity ${m.lexicalDiversity.toFixed(2)}).` });
    if (sophScore < 0.5) fb.LR.push({ kind: 'tip', text: 'Use more precise, less common words (for example "considerable", "consistently", "complement").' });
    if (m.spellingErrors.length) fb.LR.push({ kind: 'fix', text: 'Check spelling: ' + [...new Set(m.spellingErrors)].join(', ') + '.' });
    if (m.complexRatio < 0.35) fb.GRA.push({ kind: 'fix', text: `Only ${Math.round(m.complexRatio * 100)}% of sentences are complex. Join ideas with "although", "which" or "because".` });
    else fb.GRA.push({ kind: 'good', text: `${Math.round(m.complexRatio * 100)}% of sentences use complex structures.` });
    if (asl > 30) fb.GRA.push({ kind: 'tip', text: `Sentences are very long (average ${asl.toFixed(0)} words). Split some to keep them accurate.` });
    m.errors.slice(0, 4).forEach(e => fb.GRA.push({ kind: 'fix', text: `Possible error: ${e.label}, e.g. "${e.example}".` }));
    if (!m.errors.length && !m.spellingErrors.length) fb.GRA.push({ kind: 'good', text: 'No common error patterns were detected.' });

    // confidence: the simulated system knows when its proxies are weak
    let confidence = 'medium';
    const reasons = [];
    if (r >= 1 && cov.ratio >= 0.75) confidence = 'high';
    if (cov.ratio < 0.4) { confidence = 'low'; reasons.push('The answer may be off-topic: few of the expected ideas were found.'); }
    if (r < 0.6) { confidence = 'low'; reasons.push('The answer is much shorter than the minimum, so the estimate is unreliable.'); }

    const criteria = ['TA', 'CC', 'LR', 'GRA'].map(code => ({
      code, label: DESCRIPTOR_BANK[code].label, band: bands[code], raw: raw[code], descriptor: descriptorFor(code, bands[code]), feedback: fb[code]
    }));
    return { status: 'ok', task: task.key, taskNumber: task.task, band, criteria, judge, proxies, metrics: m, coverage: cov, hasPosition, confidence, reasons, steps };
  }

  // Writing component band: Task 2 counts twice as much as Task 1.
  function combineWritingTasks(t1, t2) {
    if (typeof t1 === 'number' && typeof t2 === 'number') return { band: roundHalf((t1 + 2 * t2) / 3), basis: 'both' };
    if (typeof t2 === 'number') return { band: t2, basis: 'task2 only' };
    if (typeof t1 === 'number') return { band: t1, basis: 'task1 only' };
    return null;
  }

  // ----------------------------------------------------------------- SPEAKING pipeline
  const DISCOURSE = ['well', 'actually', 'to be honest', 'first', 'firstly', 'at first', 'then', 'after that', 'finally', 'however', 'on the other hand',
    'for example', 'for instance', 'because', 'so', 'looking back', 'the main reason', 'on top of that', 'in the end', 'i think', 'i would say',
    'personally', 'what made', 'apart from that', 'as a result', 'since', 'mainly'];

  function scoreSpeaking(transcript, seconds, part) {
    const text = String(transcript || '');
    const pauseMarkers = (text.match(/\(pause\)|\.\.\.|…/gi) || []).length;
    const fillers = (text.match(FILLERS) || []).length;
    const clean = text.replace(/\(pause\)/gi, ' ').replace(FILLERS, ' ');
    const m = measureText(clean);
    if (m.wordCount < 15) return { status: 'error', message: 'Say or type at least 15 words so there is something to analyse.' };
    const secs = Math.max(10, Number(seconds) || (part && part.seconds) || 60);
    const wpm = m.wordCount / (secs / 60);
    const dm = countPhrases(m.lower, DISCOURSE);
    const dmDistinct = Object.keys(dm).length;
    const fillerPer100 = (fillers / m.wordCount) * 100;
    const pausePer100 = (pauseMarkers / m.wordCount) * 100;
    const cov = coverageOf(m.lower, part && part.coverage);

    // COMBINE
    const wpmScore = wpm > 190 ? clamp(1 - (wpm - 190) / 60) : clamp((wpm - 60) / 70);
    const fillerScore = clamp(1 - fillerPer100 / 8);
    const pauseScore = clamp(1 - pausePer100 / 4);
    const dmScore = clamp(dmDistinct / 6);
    const FC = 2.5 + 2 * wpmScore + 1.5 * fillerScore + 1 * pauseScore + 1.5 * dmScore;
    const divScore = clamp((m.lexicalDiversity - 0.74) / 0.14);
    const sophScore = clamp((m.sophistication - 0.04) / 0.13);
    const SLR = 3 + 2.5 * divScore + 2.5 * sophScore + 0.5 * cov.ratio;
    const complexScore = clamp(m.complexRatio / 0.6);
    const errScore = clamp(1 - m.errorsPer100 / 5);
    const asl = m.avgSentenceLength;
    const lenScore = asl >= 10 && asl <= 30 ? 1 : asl < 10 ? clamp((asl - 4) / 6) : 0.7;
    const SGRA = 2.5 + 1.5 * complexScore + 1 * lenScore + 2.5 * errScore;
    // holistic judge index (stands in for a model judging the whole answer)
    const judge = 3 + 2 * errScore + 1.5 * sophScore + 1 * divScore + 1.5 * wpmScore;
    const blend = x => 0.5 * x + 0.5 * judge;
    // Pronunciation cannot be measured from a transcript. The simulation uses the
    // fluency score as a proxy and marks it LOW confidence.
    const raw = { FC: blend(FC), SLR: blend(SLR), SGRA: blend(SGRA) };
    raw.PR = raw.FC;
    const bands = {};
    Object.keys(raw).forEach(k => { bands[k] = Math.max(1, Math.min(9, Math.round(raw[k]))); });
    const band = roundHalf((bands.FC + bands.SLR + bands.SGRA + bands.PR) / 4);

    // JUDGE
    const fb = { FC: [], SLR: [], SGRA: [], PR: [] };
    if (wpm < 90) fb.FC.push({ kind: 'fix', text: `Speech rate is slow (${Math.round(wpm)} words per minute). Natural exam speech is roughly 110-160.` });
    else if (wpm > 190) fb.FC.push({ kind: 'tip', text: `Very fast (${Math.round(wpm)} wpm). Slow down slightly so the examiner can follow.` });
    else fb.FC.push({ kind: 'good', text: `Comfortable speech rate (${Math.round(wpm)} wpm).` });
    if (fillers) fb.FC.push({ kind: fillerPer100 > 4 ? 'fix' : 'tip', text: `${fillers} filler word${fillers > 1 ? 's' : ''} ("um", "er", "like"). Replace them with a short silent pause or a phrase such as "Let me think".` });
    if (pauseMarkers) fb.FC.push({ kind: pausePer100 > 2 ? 'fix' : 'tip', text: `${pauseMarkers} long pause${pauseMarkers > 1 ? 's' : ''} marked. Plan the next point while finishing the current one.` });
    if (dmDistinct < 3) fb.FC.push({ kind: 'tip', text: 'Use discourse markers to guide the listener: "The main reason was...", "After that...", "Looking back...".' });
    else fb.FC.push({ kind: 'good', text: `Uses ${dmDistinct} different discourse markers.` });
    if (divScore < 0.4) fb.SLR.push({ kind: 'fix', text: 'Several words are repeated. Paraphrase instead of repeating the question words.' });
    else fb.SLR.push({ kind: 'good', text: 'Good variety of vocabulary.' });
    if (cov.missed && cov.missed.length) fb.SLR.push({ kind: 'tip', text: 'Cue-card points not clearly covered: ' + cov.missed.join('; ') + '.' });
    if (sophScore < 0.5) fb.SLR.push({ kind: 'tip', text: 'Add some precise or less common words to show range.' });
    if (m.complexRatio < 0.35) fb.SGRA.push({ kind: 'fix', text: `Mostly simple sentences (${Math.round(m.complexRatio * 100)}% complex). Try "which", "because", "although", "when".` });
    else fb.SGRA.push({ kind: 'good', text: `${Math.round(m.complexRatio * 100)}% of sentences are complex.` });
    m.errors.slice(0, 4).forEach(e => fb.SGRA.push({ kind: 'fix', text: `Possible error: ${e.label}, e.g. "${e.example}".` }));
    fb.PR.push({ kind: 'warn', text: 'Not measured. A transcript contains no sound, so this band is copied from Fluency as a placeholder. Record yourself, listen back, and check word stress and final consonants.' });

    const confidence = m.wordCount < 50 ? 'low' : 'medium';
    const reasons = ['Pronunciation is a placeholder because there is no audio analysis in this prototype.'];
    if (m.wordCount < 50) reasons.push('Very short answer: estimates are rough.');

    const labels = { FC: 'Fluency and Coherence', SLR: 'Lexical Resource', SGRA: 'Grammatical Range and Accuracy', PR: 'Pronunciation' };
    const criteria = ['FC', 'SLR', 'SGRA', 'PR'].map(code => ({
      code, label: labels[code], band: bands[code], raw: raw[code], descriptor: descriptorFor(code, bands[code]), feedback: fb[code], lowConfidence: code === 'PR'
    }));
    return { status: 'ok', band, criteria, confidence, reasons,
      metrics: { wordCount: m.wordCount, seconds: secs, wpm, fillers, pauseMarkers, discourseMarkers: dmDistinct, sentenceCount: m.sentenceCount,
        complexRatio: m.complexRatio, lexicalDiversity: m.lexicalDiversity, errorCount: m.errorCount, coverage: cov.ratio } };
  }

  // ----------------------------------------------------------------- CALIBRATE
  // Compare engine output with reference (teacher) ratings. Agreement target: within 0.5 band.
  function calibrate(cases) {
    const rows = cases.map(c => {
      const out = c.kind === 'speaking' ? scoreSpeaking(c.text, c.seconds, c.part) : scoreWriting(c.text, c.task);
      const diff = out.band - c.teacherBand;
      return { id: c.id, reference: c.teacherBand, system: out.band, diff, withinHalf: Math.abs(diff) <= 0.5 };
    });
    const agree = rows.filter(r => r.withinHalf).length;
    const mae = rows.reduce((s, r) => s + Math.abs(r.diff), 0) / (rows.length || 1);
    return { rows, agreement: agree / (rows.length || 1), mae };
  }

  // ----------------------------------------------------------------- study plan
  function studyPlan(profile, bands) {
    const skills = ['listening', 'reading', 'writing', 'speaking'];
    const target = Number(profile.target) || 6.5;
    const gaps = skills.map(s => ({ skill: s, current: bands[s], gap: Math.max(0.5, target - (bands[s] || target - 1)) }));
    gaps.sort((a, b) => b.gap - a.gap);
    const minutes = Number(profile.minutes) || 45;
    const totalGap = gaps.reduce((s, g) => s + g.gap, 0);
    const vocabMins = Math.max(5, Math.round(minutes * 0.12));
    const rest = minutes - vocabMins;
    const alloc = gaps.map(g => Object.assign({}, g, { minutes: Math.max(5, Math.round((g.gap / totalGap) * rest / 5) * 5) }));
    let daysLeft = null;
    if (profile.examDate) daysLeft = Math.ceil((new Date(profile.examDate) - new Date(new Date().toDateString())) / 86400000);
    return { alloc, vocabMins, daysLeft, focus: alloc.slice(0, 2).map(a => a.skill) };
  }

  const Engine = { BAND_ANCHORS, rawToBand, roundHalf, overallBand, normalise, levenshtein, checkAnswer, scoreObjective, measureText,
    scoreWriting, combineWritingTasks, scoreSpeaking, calibrate, studyPlan, DESCRIPTOR_BANK, descriptorFor, coverageOf };
  root.Engine = Engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
