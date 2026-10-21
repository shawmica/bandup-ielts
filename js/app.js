/* BandUp - application shell and screens.
 * Plain JavaScript, no framework or build step: small download (low-data context),
 * easy for the group to read and change. Hash routing so it works on any static host.
 */
(function () {
  'use strict';
  const C = window.Content, E = window.Engine;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
  const SKILL_LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };
  const fmt = b => (typeof b === 'number' ? b.toFixed(1) : '-');
  const today = () => new Date().toISOString().slice(0, 10);

  // ------------------------------------------------------------------ state
  // Everything stays in this browser's storage. Nothing is sent to a server.
  const KEY = 'bandup.v1';
  const DEFAULT = {
    onboarded: false,
    profile: { target: 6.5, examDate: '', module: 'academic', minutes: 45, l1: 'si', purpose: 'study', l1Help: true },
    bands: {}, history: [], typeStats: {}, writingTasks: {}, attempts: { writing: 0, reading: 0 },
    streak: { count: 0, last: '' }, done: { date: '', items: [] },
    settings: { text: 'm', contrast: false, motion: false, lowData: false, annotate: false, theme: 'system' },
    vocab: {}
  };
  let S;
  function load() {
    try { S = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { S = JSON.parse(JSON.stringify(DEFAULT)); }
    S.profile = Object.assign({}, DEFAULT.profile, S.profile); S.settings = Object.assign({}, DEFAULT.settings, S.settings);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: app still works for this session */ } }
  load();

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }

  function applySettings() {
    const r = document.documentElement, st = S.settings;
    r.dataset.text = st.text;
    if (st.contrast) r.dataset.contrast = 'high'; else delete r.dataset.contrast;
    if (st.motion) r.dataset.motion = 'reduce'; else delete r.dataset.motion;
    if (st.theme === 'system') delete r.dataset.theme; else r.dataset.theme = st.theme;
    document.body.classList.toggle('annotate', !!st.annotate);
    $('#dataChip').hidden = !st.lowData;
  }

  function markActivity(itemKey) {
    const d = today();
    if (S.streak.last !== d) {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      S.streak.count = S.streak.last === y ? S.streak.count + 1 : 1;
      S.streak.last = d;
      if (S.streak.count > 1) setTimeout(() => toast(`${S.streak.count}-day streak. Keep it going!`), 400);
    }
    if (S.done.date !== d) S.done = { date: d, items: [] };
    if (itemKey && !S.done.items.includes(itemKey)) S.done.items.push(itemKey);
  }

  function recordBand(skill, band, detail) {
    S.bands[skill] = band;
    S.history.push({ date: new Date().toISOString(), skill, band, detail: detail || '' });
    if (S.history.length > 200) S.history = S.history.slice(-200);
    markActivity(skill);
    save();
  }

  function addTypeStats(skill, byType) {
    S.typeStats[skill] = S.typeStats[skill] || {};
    Object.entries(byType).forEach(([t, v]) => {
      const cur = S.typeStats[skill][t] || { correct: 0, total: 0 };
      S.typeStats[skill][t] = { correct: cur.correct + v.correct, total: cur.total + v.total };
    });
  }

  // ------------------------------------------------------------------ shared UI pieces
  function simBanner(extra) {
    return `<div class="sim-banner" role="note" data-note="Transparency: AI clearly labelled"><span class="glyph" aria-hidden="true">AI</span>
      <div><strong>Prototype: simulated AI.</strong> Feedback is produced by rules and a pre-written feedback bank on this phone, not by a live AI service. It is practice feedback, not an official IELTS score.${extra ? ' ' + extra : ''}</div></div>`;
  }

  // The IELTS 0-9 scale with half-band ticks; optional target marker.
  function ruler(band, target, opts = {}) {
    const W = 300, x = v => 10 + (v / 9) * (W - 20);
    let ticks = '';
    for (let v = 0; v <= 9; v += 0.5) {
      const whole = v % 1 === 0;
      ticks += `<line class="tick${whole ? '' : ' half'}" x1="${x(v)}" x2="${x(v)}" y1="${whole ? 20 : 22}" y2="${whole ? 30 : 28}"/>`;
      if (whole) ticks += `<text class="tlabel" x="${x(v)}" y="42">${v}</text>`;
    }
    const fillW = typeof band === 'number' ? x(band) - 10 : 0;
    const tg = typeof target === 'number' ? `<line class="target" x1="${x(target)}" x2="${x(target)}" y1="6" y2="32"/><text class="tglabel" x="${x(target)}" y="4">target ${fmt(target)}</text>` : '';
    return `<div class="ruler" role="img" aria-label="${opts.label || 'Band'} ${fmt(band)} on the 0 to 9 IELTS scale${typeof target === 'number' ? ', target ' + fmt(target) : ''}">
      <svg viewBox="0 0 ${W} 46" preserveAspectRatio="none"><rect class="track" x="10" y="22" width="${W - 20}" height="6" rx="3"/>
      <rect class="fill" x="10" y="22" width="${Math.max(0, fillW)}" height="6" rx="3"/>${ticks}${tg}</svg></div>`;
  }

  function l1Line(key) {
    const lang = S.profile.l1;
    if (!S.profile.l1Help || !C.I18N[key] || !(lang === 'si' || lang === 'ta')) return '';
    return `<p class="l1" lang="${lang}" data-note="Language support: L1 instructions">${esc(C.I18N[key][lang])}</p>`;
  }

  function fbList(items) {
    const ic = { good: '&#10003;', fix: '!', tip: '&#8594;', warn: '?' };
    return `<ul class="fblist">${items.map(f => `<li><span class="ic ${f.kind}" aria-hidden="true">${ic[f.kind] || ''}</span><span><span class="sr">${f.kind === 'fix' ? 'Fix: ' : f.kind === 'good' ? 'Strength: ' : ''}</span>${esc(f.text)}</span></li>`).join('')}</ul>`;
  }

  function shuffleIdx(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i);
    let s = seed || Math.floor(Math.random() * 1e9);
    for (let i = n - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ------------------------------------------------------------------ speech (device text-to-speech: no download)
  const TTS = {
    ok: 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
    voices: [],
    pickVoices() {
      if (!this.ok) return;
      const v = speechSynthesis.getVoices().filter(x => /^en/i.test(x.lang));
      this.voices = v.length ? v : speechSynthesis.getVoices();
    },
    stop() { if (this.ok) speechSynthesis.cancel(); this._stopped = true; },
    playLines(lines, speakers, { rate = 1, onLine, onEnd } = {}) {
      if (!this.ok) { onEnd && onEnd(false); return; }
      this.stop(); this._stopped = false; this.pickVoices();
      const en = this.voices;
      const byS = {};
      Object.keys(speakers).forEach((k, i) => { byS[k] = en.length ? en[Math.min(i * 2, en.length - 1)] : null; });
      let i = 0;
      const next = () => {
        if (this._stopped) return;
        if (i >= lines.length) { onEnd && onEnd(true); return; }
        const ln = lines[i];
        const u = new SpeechSynthesisUtterance(ln.say || ln.text);
        const sp = speakers[ln.s] || {};
        if (byS[ln.s]) u.voice = byS[ln.s];
        u.lang = (u.voice && u.voice.lang) || 'en-GB';
        u.pitch = sp.pitch || 1; u.rate = (sp.rate || 1) * rate;
        u.onend = () => { i++; setTimeout(next, 350); };
        u.onerror = () => { i++; next(); };
        onLine && onLine(ln, i);
        speechSynthesis.speak(u);
      };
      setTimeout(next, 50);
    }
  };
  if (TTS.ok) { TTS.pickVoices(); speechSynthesis.onvoiceschanged = () => TTS.pickVoices(); }

  // ------------------------------------------------------------------ router
  const routes = {};
  let cleanup = null;
  function go(hash) { if (location.hash === '#' + hash) render(); else location.hash = hash; }
  function render() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    TTS.stop();
    let name = (location.hash || '').replace('#', '') || 'home';
    if (!S.onboarded && !['onboarding', 'diagnostic', 'about', 'settings'].includes(name)) name = 'onboarding';
    if (!routes[name]) name = 'home';
    const r = routes[name];
    const main = $('#main');
    $('#screenName').textContent = r.title || '';
    document.title = (r.title ? r.title + ' - ' : '') + 'BandUp IELTS Practice';
    document.body.classList.toggle('no-tabs', !!r.noTabs);
    $('#backBtn').hidden = !r.back;
    $('#backBtn').onclick = () => go(r.back);
    $$('#tabbar a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === (r.tab || name) ? 'page' : 'false'));
    main.innerHTML = '';
    const ret = r.render(main);
    if (typeof ret === 'function') cleanup = ret;
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', render);

  // ================================================================== 1 ONBOARDING
  routes.onboarding = {
    title: 'Set up', noTabs: true,
    render(main) {
      let step = 0;
      const p = Object.assign({}, S.profile);
      const draw = () => {
        const steps = `<div class="steps" aria-label="Step ${step + 1} of 3">${[0, 1, 2].map(i => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>`;
        let body = '';
        if (step === 0) body = `
          <div class="stack-s"><p class="eyebrow">Step 1 of 3</p><h1>Which IELTS are you taking?</h1>
          <p class="muted">The two versions share Listening and Speaking. Reading and Writing Task 1 differ.</p></div>
          <div class="stack" role="group" aria-label="Test version">
            ${[['academic', 'Academic', 'For university entry or professional registration'], ['general', 'General Training', 'For migration, work or secondary education']]
              .map(([v, t, d]) => `<button class="opt" data-mod="${v}" aria-pressed="${p.module === v}"><span><strong>${t}</strong><br><span class="muted small">${d}</span></span></button>`).join('')}
          </div>
          <label class="field">What is it for?<select id="purpose">${[['study', 'University study'], ['migration', 'Migration'], ['work', 'Work abroad'], ['other', 'Other']].map(([v, t]) => `<option value="${v}" ${p.purpose === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        if (step === 1) body = `
          <div class="stack-s"><p class="eyebrow">Step 2 of 3</p><h1>Your goal and time</h1></div>
          <div class="stack-s"><strong id="tgl">Target overall band</strong>
            <div class="seg" role="group" aria-labelledby="tgl">${[5.5, 6, 6.5, 7, 7.5, 8].map(b => `<button data-target="${b}" aria-pressed="${p.target === b}" class="num">${fmt(b)}</button>`).join('')}</div></div>
          <label class="field">Exam date <span class="hint">Leave empty if you have not booked yet.</span><input type="date" id="examDate" value="${esc(p.examDate)}"></label>
          <div class="stack-s"><strong id="mnl">Study time per day</strong>
            <div class="seg" role="group" aria-labelledby="mnl">${[15, 30, 45, 60, 90].map(m => `<button data-min="${m}" aria-pressed="${p.minutes === m}">${m} min</button>`).join('')}</div></div>`;
        if (step === 2) body = `
          <div class="stack-s"><p class="eyebrow">Step 3 of 3</p><h1>Language and data</h1></div>
          <label class="field">First language<select id="l1">${[['si', 'Sinhala'], ['ta', 'Tamil'], ['en', 'English'], ['other', 'Other']].map(([v, t]) => `<option value="${v}" ${p.l1 === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="switch"><span class="lbl">Show short instructions in my language<small>Sinhala or Tamil, under the English instruction</small></span><input type="checkbox" id="l1Help" ${p.l1Help ? 'checked' : ''}></label>
          <label class="switch"><span class="lbl">Low-data mode<small>Turns off animations and optional extras</small></span><input type="checkbox" id="lowData" ${S.settings.lowData ? 'checked' : ''}></label>
          <div class="card flat small"><strong>Your privacy</strong><p class="muted">Your answers and scores are saved only on this phone. Nothing is uploaded. You can delete everything in Settings.</p></div>`;
        main.innerHTML = `${steps}${body}
          <div class="row-between">${step > 0 ? '<button class="btn secondary" id="prev">Back</button>' : '<span></span>'}
          <button class="btn" id="next">${step < 2 ? 'Continue' : 'Start diagnostic test'}</button></div>
          ${step === 2 ? '<button class="btn ghost" id="skipDiag">Skip the test for now</button>' : ''}`;
        $$('[data-mod]', main).forEach(b => b.onclick = () => { p.module = b.dataset.mod; draw(); });
        $$('[data-target]', main).forEach(b => b.onclick = () => { p.target = +b.dataset.target; draw(); });
        $$('[data-min]', main).forEach(b => b.onclick = () => { p.minutes = +b.dataset.min; draw(); });
        const collect = () => {
          if ($('#purpose', main)) p.purpose = $('#purpose', main).value;
          if ($('#examDate', main)) p.examDate = $('#examDate', main).value;
          if ($('#l1', main)) { p.l1 = $('#l1', main).value; p.l1Help = $('#l1Help', main).checked; S.settings.lowData = $('#lowData', main).checked; }
        };
        if ($('#prev', main)) $('#prev', main).onclick = () => { collect(); step--; draw(); };
        $('#next', main).onclick = () => {
          collect();
          if (step < 2) { step++; draw(); return; }
          S.profile = p; S.onboarded = true; save(); applySettings(); go('diagnostic');
        };
        if ($('#skipDiag', main)) $('#skipDiag', main).onclick = () => {
          collect(); S.profile = p; S.onboarded = true;
          SKILLS.forEach(s => { if (typeof S.bands[s] !== 'number') S.bands[s] = Math.max(4, p.target - 1.5); });
          save(); applySettings(); toast('Plan uses estimated starting bands. Take the test later for accuracy.'); go('home');
        };
      };
      draw();
    }
  };

  // ================================================================== 2 DIAGNOSTIC
  routes.diagnostic = {
    title: 'Diagnostic test', noTabs: true,
    render(main) {
      const D = C.DIAGNOSTIC;
      const ans = { r: {}, l: {} };
      let section = 0, plays = 0, comfort = 3;
      const sections = ['Reading', 'Listening', 'Writing', 'Speaking'];
      const optHtml = (q, store) => q.type === 'TFNG'
        ? `<div class="tfng">${['TRUE', 'FALSE', 'NOT GIVEN'].map(v => `<button class="opt" data-q="${q.n}" data-store="${store}" data-v="${v}" aria-pressed="${ans[store][q.n] === v}">${v}</button>`).join('')}</div>`
        : `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-q="${q.n}" data-store="${store}" data-v="${i}" aria-pressed="${ans[store][q.n] === i}"><span class="letter">${'ABC'[i]}</span>${esc(o)}</button>`).join('')}</div>`;
      const draw = () => {
        let body = '';
        if (section === 0) body = `<p class="muted">Read the short text and answer 4 questions.</p>${l1Line('reading')}
          <div class="card passage"><p>${esc(D.reading.text)}</p></div>
          ${D.reading.questions.map(q => `<div class="qcard"><p><span class="qnum">${q.n}</span> ${esc(q.prompt)}</p>${optHtml(q, 'r')}</div>`).join('')}`;
        if (section === 1) body = `<p class="muted">Listen to a station announcement and complete 4 notes. You can play it twice.</p>${l1Line('listening')}
          <div class="player" id="dplayer"><div class="row-between"><strong>Announcement</strong><span class="muted small">Plays left: <span id="dplays">${2 - plays}</span></span></div>
          <div class="wave" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
          <button class="btn" id="dplay" ${plays >= 2 ? 'disabled' : ''}>${TTS.ok ? 'Play' : 'Audio unavailable'}</button>
          ${TTS.ok ? '' : `<p class="small">This device has no speech voice. Read the text below instead (marked as a text attempt).</p><p class="caption">${D.listening.script.map(l => esc(l.text)).join(' ')}</p>`}</div>
          ${D.listening.questions.map(q => `<label class="qcard field"><span><span class="qnum">${q.n}</span> ${esc(q.prompt)}</span><input type="text" data-l="${q.n}" value="${esc(ans.l[q.n] || '')}" autocomplete="off" autocapitalize="off"></label>`).join('')}`;
        if (section === 2) body = `<p>${esc(D.writing.prompt)}</p>${l1Line('writing')}
          <label class="field">Your answer<textarea id="dw" style="min-height:160px">${esc(ans.w || '')}</textarea></label><p class="wc muted"><span id="dwc">0 words</span><span>aim for 60-100</span></p>`;
        if (section === 3) body = `<p>${esc(D.speaking.prompt)}</p>${l1Line('speaking')}
          <label class="field">Your answer<textarea id="ds" style="min-height:120px">${esc(ans.s || '')}</textarea></label>
          <div class="stack-s"><strong id="cfl">How comfortable are you speaking English for 2 minutes without stopping?</strong>
          <div class="seg" role="group" aria-labelledby="cfl">${[1, 2, 3, 4, 5].map(c => `<button data-cf="${c}" aria-pressed="${comfort === c}">${['Not at all', 'A little', 'Fairly', 'Quite', 'Very'][c - 1]}</button>`).join('')}</div></div>`;
        main.innerHTML = `<div class="steps">${sections.map((_, i) => `<span class="${i <= section ? 'on' : ''}"></span>`).join('')}</div>
          <div class="stack-s"><p class="eyebrow">Part ${section + 1} of 4 &middot; about 10 minutes in total</p><h1>${sections[section]}</h1></div>${body}
          <div class="row-between">${section > 0 ? '<button class="btn secondary" id="prev">Back</button>' : '<span></span>'}<button class="btn" id="next">${section < 3 ? 'Next' : 'See my results'}</button></div>`;
        $$('.opt[data-q]', main).forEach(b => b.onclick = () => {
          const v = b.dataset.v; ans[b.dataset.store][b.dataset.q] = isNaN(+v) ? v : +v; draw();
        });
        $$('[data-l]', main).forEach(i => i.oninput = () => { ans.l[i.dataset.l] = i.value; });
        if ($('#dw', main)) { const upd = () => { ans.w = $('#dw', main).value; $('#dwc', main).textContent = E.measureText(ans.w).wordCount + ' words'; }; $('#dw', main).oninput = upd; upd(); }
        if ($('#ds', main)) $('#ds', main).oninput = () => { ans.s = $('#ds', main).value; };
        $$('[data-cf]', main).forEach(b => b.onclick = () => { comfort = +b.dataset.cf; ans.s = $('#ds', main).value; draw(); });
        if ($('#dplay', main) && TTS.ok) $('#dplay', main).onclick = () => {
          plays++; $('#dplays', main).textContent = 2 - plays; $('#dplay', main).disabled = true; $('#dplayer', main).classList.add('playing');
          TTS.playLines(D.listening.script, { R: { pitch: 1, rate: 0.95 } }, { onEnd: () => { const p = $('#dplayer', main); if (p) { p.classList.remove('playing'); if (plays < 2) $('#dplay', main).disabled = false; } } });
        };
        if ($('#prev', main)) $('#prev', main).onclick = () => { section--; draw(); };
        $('#next', main).onclick = () => { if (section < 3) { section++; draw(); } else finish(); };
      };
      const finish = () => {
        TTS.stop();
        const r = E.scoreObjective(D.reading.questions, ans.r, S.profile.module === 'general' ? 'reading_general' : 'reading_academic');
        const l = E.scoreObjective(D.listening.questions, ans.l, 'listening');
        const wt = { key: 'diag', task: 1, module: 'diag', min: C.DIAGNOSTIC.writing.min,
          coverage: [{ label: 'mentions IELTS or English', terms: ['ielts', 'english'] }, { label: 'describes how you study', terms: ['study', 'practise', 'practice', 'read', 'listen', 'write', 'book', 'app', 'class', 'teacher', 'video'] }, { label: 'names a difficulty', terms: ['difficult', 'hard', 'problem', 'challenge', 'weak', 'struggle'] }],
          position: /(difficult|hard|problem|challenge|weak|struggle)/i, positionLabel: 'what you find most difficult' };
        const w = E.scoreWriting(ans.w || '', wt);
        const wpm = [60, 80, 100, 120, 140][comfort - 1];
        const words = E.measureText(ans.s || '').wordCount;
        const sp = E.scoreSpeaking(ans.s || '', Math.max(10, (words / wpm) * 60), null);
        const bands = {
          reading: r.band, listening: l.band,
          writing: w.status === 'ok' ? Math.min(w.band, 7) : 4,
          speaking: sp.status === 'ok' ? E.roundHalf((sp.band + [4, 5, 5.5, 6.5, 7][comfort - 1]) / 2) : [4, 5, 5.5, 6, 6.5][comfort - 1]
        };
        SKILLS.forEach(s => recordBand(s, bands[s], 'diagnostic'));
        addTypeStats('reading', r.byType); addTypeStats('listening', l.byType);
        S.diagDone = today(); save();
        drawResults(bands, r, l, w);
      };
      const drawResults = (bands, r, l, w) => {
        const ov = E.overallBand(bands);
        const plan = E.studyPlan(S.profile, bands);
        main.innerHTML = `<div class="stack-s"><p class="eyebrow">Diagnostic result</p><h1>Your starting point</h1></div>
          <div class="hero" data-note="Cognitivist: activate prior knowledge"><div class="row-between"><span>Estimated overall</span><span class="bandbig">${fmt(ov.band)}</span></div>
          ${ruler(ov.band, S.profile.target, { label: 'Overall' })}<p class="small muted">Rough estimate from a 10-minute test. Writing and Speaking use the simulated AI.</p></div>
          <div class="card">${SKILLS.map(s => `<div class="stack-s"><div class="row-between"><strong>${SKILL_LABEL[s]}</strong><span class="bandmed">${fmt(bands[s])}</span></div>${ruler(bands[s], S.profile.target, { label: SKILL_LABEL[s] })}</div>`).join('')}
          <p class="small muted">Reading ${r.raw}/4 and Listening ${l.raw}/4, scaled to /40 and converted with the official tables. Four questions give a wide margin of error.</p></div>
          <div class="card"><h2>Your plan focuses on</h2><p>${plan.focus.map(f => `<span class="chip accent">${SKILL_LABEL[f]}</span>`).join(' ')}</p>
          <p class="muted small">The skills furthest below your target get the most minutes each day.</p></div>
          <button class="btn block" id="toHome">Go to my dashboard</button>`;
        $('#toHome', main).onclick = () => go('home');
      };
      draw();
      return () => TTS.stop();
    }
  };

  // ================================================================== 3 HOME DASHBOARD
  routes.home = {
    title: 'Today', tab: 'home',
    render(main) {
      const b = S.bands, p = S.profile;
      const ov = E.overallBand(b);
      const plan = E.studyPlan(p, b);
      if (S.done.date !== today()) S.done = { date: today(), items: [] };
      const daysTxt = plan.daysLeft == null ? 'No exam date set' : plan.daysLeft < 0 ? 'Exam date has passed' : `${plan.daysLeft} days to your exam`;
      const items = plan.alloc.slice(0, 3).map(a => ({ key: a.skill, href: '#' + a.skill, title: `${SKILL_LABEL[a.skill]} practice`, sub: a.skill === 'writing' ? 'Task 2 essay with AI feedback' : a.skill === 'speaking' ? 'Part 2 long turn' : a.skill === 'reading' ? 'Mangrove passage, 10 questions' : 'Course registration call, 10 questions', mins: a.minutes }));
      items.push({ key: 'vocab', href: '#vocab', title: 'Vocabulary review', sub: dueCount() + ' words due', mins: plan.vocabMins });
      const doneN = items.filter(i => S.done.items.includes(i.key)).length;
      const spark = s => {
        const pts = S.history.filter(h => h.skill === s).slice(-6).map(h => h.band);
        if (pts.length < 2) return '';
        const W = 60, H = 18, x = i => (i / (pts.length - 1)) * W, y = v => H - ((v - 3) / 6) * H;
        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="sk-${s}" style="fill:none;stroke-width:2" d="${pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')}"/></svg>`;
      };
      main.innerHTML = `
        <div class="hero" data-note="Goal-setting: target vs current">
          <div class="row-between"><div><p class="small muted">Estimated overall band</p><p class="bandbig">${ov ? fmt(ov.band) : '-'}</p></div>
          <div style="text-align:right"><p class="small muted">Target</p><p class="bandmed">${fmt(p.target)}</p></div></div>
          ${ruler(ov ? ov.band : null, p.target, { label: 'Overall' })}
          <p class="small">${esc(daysTxt)} &middot; ${p.module === 'general' ? 'General Training' : 'Academic'}</p>
        </div>
        <div class="streak" data-note="Behaviorist: streak (positive reinforcement)"><span class="flame num">${S.streak.count}</span>
          <div><strong>${S.streak.count === 1 ? '1-day streak' : S.streak.count + '-day streak'}</strong><p class="small muted">${doneN}/${items.length} of today's plan done. Missing a day resets the count, not your progress.</p></div></div>
        <section class="card" aria-labelledby="planh" data-note="Personalised plan from diagnostic gaps">
          <div class="section-title"><h2 id="planh">Today's plan</h2><span class="muted small num">${p.minutes} min</span></div>
          <div>${items.map(i => `<a class="plan-item ${S.done.items.includes(i.key) ? 'done' : ''}" href="${i.href}"><span class="check" aria-hidden="true">${S.done.items.includes(i.key) ? '&#10003;' : ''}</span>
            <span class="stack-s" style="gap:0"><span class="t"><strong>${esc(i.title)}</strong></span><span class="small muted">${esc(i.sub)}</span></span><span class="chip num">${i.mins} min</span></a>`).join('')}</div>
        </section>
        <section class="stack-s" aria-labelledby="skh"><div class="section-title"><h2 id="skh">Skills</h2><a href="#progress" class="small">See progress</a></div>
          <div class="skilltiles">${SKILLS.map(s => `<a class="skilltile" href="#${s}"><span class="muted small">${SKILL_LABEL[s]}</span>
            <span class="row-between"><span class="bandmed">${fmt(b[s])}</span>${spark(s)}</span>
            <span class="small ${typeof b[s] === 'number' && b[s] >= p.target ? 'muted' : ''}">${typeof b[s] === 'number' ? (b[s] >= p.target ? 'At target' : `${fmt(p.target - b[s])} to target`) : 'Not tested'}</span></a>`).join('')}</div>
        </section>`;
    }
  };

  // ================================================================== PRACTICE HUB
  routes.practice = {
    title: 'Practice', tab: 'practice',
    render(main) {
      const cards = [
        ['reading', 'Reading', 'Rebuilding the Coastline: 10 questions, 3 question types', 'Answer key'],
        ['listening', 'Listening', 'Registering for an evening class: 10 questions', 'Answer key'],
        ['writing', 'Writing', 'Task 1 and Task 2 with band-descriptor feedback', 'Simulated AI'],
        ['speaking', 'Speaking', 'Parts 1-3 with a simulated examiner', 'Simulated AI']
      ];
      main.innerHTML = `<h1>Practice</h1>
        ${cards.map(([k, t, d, chip]) => `<a class="card" href="#${k}" style="text-decoration:none;color:inherit"><div class="row-between"><h2>${t}</h2><span class="chip ${chip === 'Simulated AI' ? 'sim' : 'accent'}">${chip}</span></div><p class="muted small">${d}</p>
          <div class="row-between small"><span class="muted">Latest band</span><span class="bandmed" style="font-size:1.1rem">${fmt(S.bands[k])}</span></div></a>`).join('')}
        <div class="grid2"><a class="btn secondary" href="#vocab">Vocabulary review</a><a class="btn secondary" href="#diagnostic">Retake diagnostic</a></div>
        <a class="btn ghost" href="#about">How the simulated AI works</a>`;
    }
  };

  // ================================================================== 4 READING
  routes.reading = {
    title: 'Reading', tab: 'practice', back: 'practice',
    render(main) {
      const R = C.READING;
      const st = { tab: 'q', resp: {}, tries: {}, firstTry: {}, locked: {}, exam: false, finished: false, start: Date.now() };
      const order = {}; R.questions.filter(q => q.type === 'MCQ').forEach(q => { order[q.n] = shuffleIdx(q.options.length); });
      const showHint = (S.attempts.reading || 0) < 2; // scaffolding fades after two completed attempts
      const passageHtml = () => `<article class="card passage" aria-label="Reading passage"><div class="stack-s"><p class="eyebrow">Passage &middot; about ${R.minutes} minutes</p><h2>${esc(R.title)}</h2><p class="muted">${esc(R.subtitle)}</p></div>
        ${R.paragraphs.map(([l, t]) => `<p id="para-${l}"><span class="plabel">${l}</span>${esc(t)}</p>`).join('')}</article>`;
      const qHtml = q => {
        const tries = st.tries[q.n] || 0, locked = st.locked[q.n], resp = st.resp[q.n];
        const correct = locked && st.firstTry[q.n] !== undefined && E.checkAnswer(q, resp, 2).correct;
        let input = '';
        if (q.type === 'TFNG') input = `<div class="tfng">${['TRUE', 'FALSE', 'NOT GIVEN'].map(v => {
          const cls = locked && !st.exam ? (v === q.answer ? 'is-right' : (resp === v ? 'is-wrong' : '')) : '';
          return `<button class="opt ${cls}" data-q="${q.n}" data-v="${v}" aria-pressed="${resp === v}" ${locked ? 'disabled' : ''}>${v}</button>`; }).join('')}</div>`;
        if (q.type === 'MCQ') input = `<div class="opts">${order[q.n].map((oi, pos) => {
          const cls = locked && !st.exam ? (oi === q.answer ? 'is-right' : (resp === oi ? 'is-wrong' : '')) : '';
          return `<button class="opt ${cls}" data-q="${q.n}" data-v="${oi}" aria-pressed="${resp === oi}" ${locked ? 'disabled' : ''}><span class="letter">${'ABCD'[pos]}</span>${esc(q.options[oi])}</button>`; }).join('')}</div>`;
        if (q.type === 'COMPLETION') input = `<div class="gap-input"><input type="text" data-gap="${q.n}" value="${esc(resp || '')}" ${locked ? 'disabled' : ''} aria-label="Answer to question ${q.n}" autocomplete="off" autocapitalize="off"></div>`;
        let fb = '';
        if (!st.exam && tries > 0) {
          const res = E.checkAnswer(q, resp, 2);
          if (res.correct) fb = `<div class="fb good" data-note="Behaviorist: immediate feedback"><span class="tag">Correct${tries > 1 ? ' on second try' : ''}</span>${esc(q.explain)}</div>`;
          else if (!locked) fb = `<div class="fb hint" data-note="Constructivist: hint before answer (scaffold)"><span class="tag">Not yet. Hint</span>${esc(q.hint)}${res.note ? ' (' + esc(res.note) + ')' : ''}</div>`;
          else fb = `<div class="fb bad"><span class="tag">Answer: ${esc(q.type === 'MCQ' ? q.options[q.answer] : Array.isArray(q.answer) ? q.answer[0] : q.answer)}</span>${esc(q.explain)}</div>`;
        }
        const showBtn = !st.exam && !locked;
        return `<div class="qcard ${locked && !st.exam ? (correct ? 'correct' : 'wrong') : ''}" id="q-${q.n}">
          <p><span class="qnum">${q.n}</span> ${esc(q.prompt)}</p>${input}
          <div class="row-between">${showBtn ? `<button class="btn small" data-check="${q.n}" ${resp === undefined || resp === '' ? 'disabled' : ''}>Check</button>` : '<span></span>'}
          <button class="btn ghost small" data-para="${q.para}">Show paragraph ${q.para}</button></div>${fb}</div>`;
      };
      const groupsHtml = () => R.groups.map(g => `<section class="stack" aria-label="${g.label}"><div class="stack-s"><h3>${g.label}</h3><p class="small muted">${esc(g.instruction)}</p></div>
        ${R.questions.filter(q => q.type === g.type).map(qHtml).join('')}</section>`).join('');
      const draw = () => {
        if (st.finished) return;
        const answered = R.questions.filter(q => st.resp[q.n] !== undefined && st.resp[q.n] !== '').length;
        main.innerHTML = `<div class="stack-s"><h1>${esc(R.title)}</h1>${l1Line('reading')}</div>
          <label class="switch"><span class="lbl">Exam mode<small>${st.exam ? 'No feedback until you submit' : 'Instant feedback and hints on each question'}</small></span><input type="checkbox" id="exam" ${st.exam ? 'checked' : ''}></label>
          <div class="tabs" role="tablist"><button role="tab" aria-selected="${st.tab === 'p'}" data-tab="p">Passage</button><button role="tab" aria-selected="${st.tab === 'q'}" data-tab="q">Questions <span class="num">${answered}/10</span></button></div>
          <div ${st.tab === 'p' ? '' : 'hidden'}>${passageHtml()}</div>
          <div class="stack" ${st.tab === 'q' ? '' : 'hidden'} data-note="Cognitivist: questions chunked by type">${groupsHtml()}
          <button class="btn block" id="finish">Finish and see band</button></div>`;
        bind();
      };
      const bind = () => {
        $('#exam', main).onchange = e => { st.exam = e.target.checked; draw(); };
        $$('[data-tab]', main).forEach(b => b.onclick = () => { st.tab = b.dataset.tab; draw(); });
        $$('.opt[data-q]', main).forEach(b => b.onclick = () => { const v = b.dataset.v; st.resp[b.dataset.q] = isNaN(+v) ? v : +v; draw(); keep(b.dataset.q); });
        $$('[data-gap]', main).forEach(i => i.oninput = () => { st.resp[i.dataset.gap] = i.value; const btn = $(`[data-check="${i.dataset.gap}"]`, main); if (btn) btn.disabled = !i.value.trim(); });
        $$('[data-check]', main).forEach(b => b.onclick = () => {
          const n = +b.dataset.check, q = R.questions.find(x => x.n === n);
          st.tries[n] = (st.tries[n] || 0) + 1;
          const res = E.checkAnswer(q, st.resp[n], 2);
          if (st.firstTry[n] === undefined) st.firstTry[n] = res.correct;
          if (res.correct || st.tries[n] >= 2 || !showHint) st.locked[n] = true;
          draw(); keep(n);
        });
        $$('[data-para]', main).forEach(b => b.onclick = () => {
          st.tab = 'p'; draw();
          const el = $('#para-' + b.dataset.para, main); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'center' }); }
        });
        $('#finish', main).onclick = finish;
      };
      const keep = n => { const el = $('#q-' + n, main); if (el) el.scrollIntoView({ block: 'nearest' }); };
      const finish = () => {
        // Score uses the FIRST attempt in practice mode, so hints cannot inflate the band.
        const scored = {};
        R.questions.forEach(q => { scored[q.n] = st.exam || st.firstTry[q.n] === undefined ? st.resp[q.n] : (st.firstTry[q.n] ? st.resp[q.n] : '__wrong__'); });
        const table = S.profile.module === 'general' ? 'reading_general' : 'reading_academic';
        const res = E.scoreObjective(R.questions, scored, table, { maxWords: 2 });
        st.finished = true; S.attempts.reading = (S.attempts.reading || 0) + 1;
        addTypeStats('reading', res.byType); recordBand('reading', res.band, `${res.raw}/10`);
        const secs = Math.round((Date.now() - st.start) / 1000);
        objectiveResult(main, res, R.questions, { skill: 'reading', table, secs, names: { TFNG: 'True / False / Not Given', MCQ: 'Multiple choice', COMPLETION: 'Sentence completion' }, redo: () => go('reading') });
      };
      draw();
    }
  };

  function objectiveResult(main, res, questions, o) {
    const tableName = { listening: 'Listening', reading_academic: 'Academic Reading', reading_general: 'General Training Reading' }[o.table];
    const typeRows = Object.entries(res.byType).map(([t, v]) => `<div class="minibar"><div class="stack-s" style="gap:2px"><span>${esc(o.names[t] || t)}</span><div class="bar"><span style="width:${(v.correct / v.total) * 100}%"></span></div></div><span class="num" style="text-align:right">${v.correct}/${v.total}</span></div>`).join('');
    const errs = res.errors;
    main.innerHTML = `<div class="stack-s"><p class="eyebrow">${SKILL_LABEL[o.skill]} result &middot; scored against the answer key</p><h1>Band ${fmt(res.band)}</h1></div>
      <div class="card" data-note="Auto-scoring: answer key, not AI">
        <div class="grid2"><div><p class="small muted">Raw score</p><p class="bandmed">${res.raw}/${res.total}</p></div><div><p class="small muted">Equivalent out of 40</p><p class="bandmed">${res.equiv40}/40</p></div></div>
        ${ruler(res.band, S.profile.target, { label: SKILL_LABEL[o.skill] })}
        <p class="small muted">Converted with the ${tableName} table from ielts.org. ${res.bandOfficial ? 'This raw score is an official anchor point.' : 'Half bands between the official anchor points are the app’s interpolation.'} A 10-question set is scaled to 40, so treat the band as an estimate.${o.secs ? ` Time: ${Math.floor(o.secs / 60)} min ${o.secs % 60} s.` : ''}</p>
      </div>
      <div class="card" data-note="Analytics: accuracy by question type"><h2>Accuracy by question type</h2>${typeRows}
        ${(errs.spelling || errs.format) ? `<p class="small"><span class="chip warn">${errs.spelling} spelling</span> <span class="chip warn">${errs.format} format</span> In the real test these answers score zero.</p>` : ''}</div>
      ${o.extra || ''}
      <div class="stack-s"><button class="btn block" id="redo">Try again (questions reshuffled)</button><a class="btn secondary block" href="#progress">See progress</a></div>`;
    $('#redo', main).onclick = o.redo;
    if (o.after) o.after(main);
  }

  // ================================================================== 5 LISTENING
  routes.listening = {
    title: 'Listening', tab: 'practice', back: 'practice',
    render(main) {
      const L = C.LISTENING;
      const st = { resp: {}, plays: 0, exam: false, captions: false, rate: 1, playing: false, line: null, predict: (S.attempts.listening || 0) < 2, submitted: false };
      const order = {}; L.questions.filter(q => q.type === 'MCQ').forEach(q => { order[q.n] = shuffleIdx(q.options.length); });
      const maxPlays = () => st.exam ? 1 : 2;
      const draw = () => {
        const left = maxPlays() - st.plays;
        main.innerHTML = `<div class="stack-s"><h1>${esc(L.title)}</h1><p class="muted small">${esc(L.context)}</p>${l1Line('listening')}</div>
          <label class="switch"><span class="lbl">Exam mode<small>One play only, no captions</small></span><input type="checkbox" id="exam" ${st.exam ? 'checked' : ''} ${st.plays ? 'disabled' : ''}></label>
          <div class="player ${st.playing ? 'playing' : ''}" id="player" data-note="Low data: device voice, no audio download">
            <div class="row-between"><strong>Recording</strong><span class="small muted">Plays left: <span class="num">${left}</span></span></div>
            <div class="wave" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
            ${TTS.ok ? `<div class="row"><button class="btn" id="play" ${left <= 0 || st.playing ? 'disabled' : ''}>${st.playing ? 'Playing...' : st.plays ? 'Replay' : 'Play'}</button>
              <button class="btn secondary" id="stop" ${st.playing ? '' : 'disabled'}>Stop</button>
              <label class="small row">Speed <select id="rate" style="width:auto;min-height:36px;padding:4px 8px">${[0.8, 1, 1.1].map(r => `<option value="${r}" ${st.rate === r ? 'selected' : ''}>${r}x</option>`).join('')}</select></label></div>`
              : `<div class="state-box error" style="color:var(--ink)"><strong>No speech voice on this device.</strong><span class="small">The prototype reads the script with the phone's built-in voice. You can open the script as text instead; the attempt is marked "text".</span><button class="btn small" id="textMode">Read the script instead</button></div>`}
            ${!st.exam ? `<label class="switch" style="min-height:36px"><span class="lbl small">Live captions<small style="color:inherit;opacity:.7">Accessibility. Makes the task easier.</small></span><input type="checkbox" id="cap" ${st.captions ? 'checked' : ''}></label>` : ''}
            ${st.captions && !st.exam ? `<p class="caption" id="caption" aria-live="polite">${st.line ? `<strong>${esc(L.speakers[st.line.s].name)}:</strong> ${esc(st.line.text)}` : 'Captions appear here while the recording plays.'}</p>` : ''}
          </div>
          ${st.predict ? `<div class="fb hint" data-note="Cognitivist: prediction activates prior knowledge"><span class="tag">Before you listen</span>Read questions 1-6 and predict the type of answer. The grey notes under each gap help; they disappear after two attempts.</div>` : ''}
          ${L.groups.map(g => `<section class="stack"><div class="stack-s"><h3>${g.label}</h3><p class="small muted">${esc(g.instruction)}</p></div>
            ${L.questions.filter(q => q.type === g.type).map(q => q.type === 'FORM'
              ? `<label class="qcard field"><span><span class="qnum">${q.n}</span> ${esc(q.prompt)}</span><input type="text" data-gap="${q.n}" value="${esc(st.resp[q.n] || '')}" autocomplete="off" autocapitalize="off">${st.predict ? `<span class="hint">Expect: ${esc(q.predict)}</span>` : ''}</label>`
              : `<div class="qcard"><p><span class="qnum">${q.n}</span> ${esc(q.prompt)}</p><div class="opts">${order[q.n].map((oi, pos) => `<button class="opt" data-q="${q.n}" data-v="${oi}" aria-pressed="${st.resp[q.n] === oi}"><span class="letter">${'ABC'[pos]}</span>${esc(q.options[oi])}</button>`).join('')}</div></div>`).join('')}</section>`).join('')}
          <button class="btn block" id="submit">Submit answers</button>
          <p class="small muted">The transcript unlocks after you submit, so you can check where each answer was.</p>`;
        bind();
      };
      const bind = () => {
        if ($('#exam', main)) $('#exam', main).onchange = e => { st.exam = e.target.checked; if (st.exam) st.captions = false; draw(); };
        if ($('#cap', main)) $('#cap', main).onchange = e => { st.captions = e.target.checked; draw(); };
        if ($('#rate', main)) $('#rate', main).onchange = e => { st.rate = +e.target.value; };
        if ($('#play', main)) $('#play', main).onclick = () => {
          st.plays++; st.playing = true; draw();
          TTS.playLines(L.script, L.speakers, { rate: st.rate,
            onLine: ln => { st.line = ln; const c = $('#caption', main); if (c) c.innerHTML = `<strong>${esc(L.speakers[ln.s].name)}:</strong> ${esc(ln.text)}`; },
            onEnd: () => { st.playing = false; st.line = null; if (!st.submitted) draw(); } });
        };
        if ($('#stop', main)) $('#stop', main).onclick = () => { TTS.stop(); st.playing = false; draw(); };
        if ($('#textMode', main)) $('#textMode', main).onclick = () => { st.textMode = true; main.insertAdjacentHTML('afterbegin', `<div class="card small">${L.script.map(l => `<p><strong>${esc(L.speakers[l.s].name)}:</strong> ${esc(l.text)}</p>`).join('')}</div>`); };
        $$('[data-gap]', main).forEach(i => i.oninput = () => { st.resp[i.dataset.gap] = i.value; });
        $$('.opt[data-q]', main).forEach(b => b.onclick = () => { st.resp[b.dataset.q] = +b.dataset.v; $$(`.opt[data-q="${b.dataset.q}"]`, main).forEach(x => x.setAttribute('aria-pressed', x === b)); });
        $('#submit', main).onclick = submit;
      };
      const submit = () => {
        TTS.stop(); st.submitted = true;
        const res = E.scoreObjective(L.questions, st.resp, 'listening');
        S.attempts.listening = (S.attempts.listening || 0) + 1;
        addTypeStats('listening', res.byType);
        recordBand('listening', res.band, `${res.raw}/10${st.captions ? ' with captions' : ''}${st.textMode ? ' text mode' : ''}`);
        // build transcript with answer locations highlighted
        const marks = { 1: 'photography', 2: 'Tuesday', 3: 'F-E-R-N-A-N-D-O', 4: '0771 486 392', 5: 'ten weeks', 6: '12,500', 7: 'poster in the library', 8: 'memory card', 9: 'main hall', 10: 'taking the bus' };
        const tr = L.script.map(l => {
          let t = esc(l.text);
          Object.entries(marks).forEach(([n, m]) => { const em = esc(m); if (t.includes(em)) { t = t.replace(em, `<mark>${em}</mark> <span class="qnum small">[${n}]</span>`); delete marks[n]; } });
          return `<p><span class="who">${esc(L.speakers[l.s].name)}</span>${t}</p>`;
        }).join('');
        const itemRows = res.items.map(i => {
          const q = L.questions.find(x => x.n === i.n);
          const given = q.type === 'MCQ' ? (i.given === undefined ? '(blank)' : q.options[i.given]) : (i.given || '(blank)');
          const right = q.type === 'MCQ' ? q.options[q.answer] : q.answer[0];
          return `<tr><td class="num">${i.n}</td><td>${esc(given)}</td><td>${i.correct ? '<span class="chip good">Correct</span>' : `<span class="chip ${i.errorType === 'spelling' || i.errorType === 'format' ? 'warn' : 'bad'}">${i.errorType}</span><br><span class="small">Answer: ${esc(right)}</span>${q.trap ? `<br><span class="small muted">${esc(q.trap)}</span>` : ''}`}</td></tr>`;
        }).join('');
        objectiveResult(main, res, L.questions, {
          skill: 'listening', table: 'listening', names: { FORM: 'Form completion', MCQ: 'Multiple choice' }, redo: () => go('listening'),
          extra: `<details open><summary>Your answers</summary><div class="inner tablewrap"><table class="metrics"><tr><th>Q</th><th>You wrote</th><th>Result</th></tr>${itemRows}</table></div></details>
            <details><summary>Transcript (unlocked after answering)</summary><div class="inner transcript" data-note="Transcript after answering: no shortcut during the task">${tr}</div></details>`
        });
      };
      draw();
      return () => TTS.stop();
    }
  };

  // ================================================================== 6 WRITING
  function chartSvg(ch) {
    const W = 340, H = 216, pl = 34, pb = 30, pt = 24, max = 10;
    const x0 = pl, x1 = W - 8, y = v => H - pb - (v / max) * (H - pb - pt);
    const gw = (x1 - x0) / ch.categories.length, bw = gw * 0.28;
    let g = '';
    for (let v = 0; v <= max; v += 2) g += `<line class="grid" x1="${x0}" x2="${x1}" y1="${y(v)}" y2="${y(v)}"/><text x="${x0 - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    ch.categories.forEach((c, i) => {
      const cx = x0 + gw * i + gw / 2;
      ch.series.forEach((s, j) => {
        const bx = cx - bw + j * bw, v = s.values[i];
        g += `<rect class="s${s.name}" x="${bx}" y="${y(v)}" width="${bw - 2}" height="${y(0) - y(v)}"><title>${s.name}, ${c}: ${v} hours</title></rect><text x="${bx + (bw - 2) / 2}" y="${y(v) - 3}" text-anchor="middle" style="font-size:9px">${v}</text>`;
      });
      g += `<text x="${cx}" y="${H - pb + 14}" text-anchor="middle">${c}</text>`;
    });
    return `<figure class="chart-wrap" style="margin:0"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ch.title)}. ${ch.categories.map((c, i) => `${c}: ${ch.series.map(s => s.name + ' ' + s.values[i]).join(', ')} hours`).join('; ')}">
      <line class="axis" x1="${x0}" x2="${x1}" y1="${y(0)}" y2="${y(0)}"/>${g}<text x="${x0}" y="${H - 2}">Age group</text><text x="${x0 - 30}" y="11">hours per week</text></svg>
      <figcaption class="small muted">${esc(ch.title)}. <span class="legend" style="display:inline-flex"><span><svg width="10" height="10"><rect class="s2016" width="10" height="10"/></svg> 2016</span><span><svg width="10" height="10"><rect class="s2024" width="10" height="10"/></svg> 2024</span></span></figcaption></figure>`;
  }

  routes.writing = {
    title: 'Writing', tab: 'practice', back: 'practice',
    render(main) {
      const t1key = S.profile.module === 'general' ? 'task1_gt' : 'task1_ac';
      const st = { key: 'task2', drafts: {}, timerStart: null, planner: (S.attempts.writing || 0) < 2 };
      const draw = () => {
        const T = C.WRITING[st.key];
        const samples = C.WRITING_SAMPLES[st.key];
        main.innerHTML = `${simBanner()}
          <div class="tabs" role="tablist"><button role="tab" data-k="${t1key}" aria-selected="${st.key === t1key}">Task 1</button><button role="tab" data-k="task2" aria-selected="${st.key === 'task2'}">Task 2</button></div>
          <div class="stack-s"><h1>${esc(T.title)}</h1><p class="small muted">${T.minutes} minutes recommended &middot; at least ${T.min} words${T.task === 2 ? ' &middot; counts double' : ''}</p>${l1Line('writing')}</div>
          <div class="prompt-box"><p>${esc(T.prompt)}</p></div>${T.chart ? chartSvg(T.chart) : ''}
          <details ${st.planner ? 'open' : ''} data-note="Constructivist: planner scaffold (fades)"><summary>Planner: how to organise it</summary><div class="inner"><ol style="margin:0;padding-left:20px">${T.scaffold.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            <p class="small muted">${st.planner ? 'The planner opens automatically for your first two essays, then stays closed so you plan on your own.' : 'Planner closed by default now: try planning without it.'}</p></div></details>
          <label class="field" for="essay">Your answer</label>
          <textarea id="essay" placeholder="Start writing here. Leave a blank line between paragraphs." spellcheck="false" aria-describedby="wcount">${esc(st.drafts[st.key] || '')}</textarea>
          <div class="wc" id="wcount"><span class="num" id="wcn">0 words</span><span id="wcm" class="chip">min ${T.min}</span></div>
          <p class="small muted">Spell-check is off, as in the real test.</p>
          ${samples ? `<details><summary>Demo: load a sample answer</summary><div class="inner"><p class="small muted">Pre-written samples show how the feedback changes with quality. Use them for testing, not as your own work.</p>
            <div class="seg">${samples.map((s, i) => `<button data-sample="${i}">${s.level[0].toUpperCase() + s.level.slice(1)}</button>`).join('')}</div></div></details>` : ''}
          <button class="btn block" id="submit">Get feedback</button>`;
        const ta = $('#essay', main);
        const upd = () => {
          st.drafts[st.key] = ta.value;
          const n = E.measureText(ta.value).wordCount;
          $('#wcn', main).textContent = n + ' words';
          const chip = $('#wcm', main); chip.className = 'chip ' + (n >= T.min ? 'good' : n >= T.min * 0.8 ? 'warn' : '');
          chip.textContent = n >= T.min ? 'minimum reached' : `${T.min - n} to minimum`;
        };
        ta.oninput = upd; upd();
        $$('[data-k]', main).forEach(b => b.onclick = () => { st.key = b.dataset.k; draw(); });
        $$('[data-sample]', main).forEach(b => b.onclick = () => { ta.value = samples[+b.dataset.sample].text; upd(); toast('Sample loaded'); });
        $('#submit', main).onclick = () => submit(T);
      };
      const submit = T => {
        const text = st.drafts[st.key] || '';
        main.innerHTML = `${simBanner()}<div class="card" aria-live="polite" data-note="Transparent pipeline: Measure, Judge, Combine"><h2>Analysing your answer</h2><div class="pipeline">
          ${[['1', 'Measure', 'Counting words, sentences, paragraphs, linking words and vocabulary range'], ['2', 'Judge', 'Matching your answer to band-descriptor statements'], ['3', 'Combine', 'Weighting results into four criterion bands'], ['4', 'Calibrate', 'Rules were tuned against reference-rated samples']]
            .map(([n, t, d], i) => `<div class="pipe-step" id="ps${i}"><span class="dot">${n}</span><div><strong>${t}</strong><p class="small muted">${d}</p></div></div>`).join('')}</div></div>`;
        const out = E.scoreWriting(text, T);
        const delay = S.settings.lowData || S.settings.motion ? 150 : 420;
        [0, 1, 2, 3].forEach(i => setTimeout(() => { const el = $('#ps' + i, main); if (el) { el.classList.add('on'); if (i < 3) el.classList.add('done'); } }, delay * (i + 1)));
        setTimeout(() => showResult(T, out, text), delay * 5);
      };
      const showResult = (T, out, text) => {
        if (out.status === 'error') {
          main.innerHTML = `${simBanner()}<div class="state-box error" role="alert" data-note="Error state: no score from too little text"><h2>We can't score this yet</h2><p>${esc(out.message)}</p><p class="small">A short answer gives the system too little evidence, so no band is shown rather than a misleading one.</p><button class="btn" id="back">Keep writing</button></div>`;
          $('#back', main).onclick = draw; return;
        }
        S.attempts.writing = (S.attempts.writing || 0) + 1;
        const low = out.confidence === 'low';
        if (!low) S.writingTasks[T.task === 2 ? 'task2' : 'task1'] = out.band;
        const comb = E.combineWritingTasks(S.writingTasks.task1, S.writingTasks.task2) || { band: out.band, basis: 'this attempt only' };
        if (!low) recordBand('writing', comb.band, `Task ${T.task}: ${fmt(out.band)}`); else { markActivity('writing'); save(); }
        const m = out.metrics;
        const confChip = { high: 'good', medium: 'warn', low: 'bad' }[out.confidence];
        const model = (C.WRITING_SAMPLES[T.key] || []).find(s => s.level === 'strong');
        main.innerHTML = `${simBanner()}
          <div class="stack-s"><p class="eyebrow">Task ${T.task} feedback</p><div class="row-between"><h1>Estimated band <span class="num">${fmt(out.band)}</span></h1><span class="chip ${confChip}">${out.confidence} confidence</span></div></div>
          ${low ? `<div class="state-box low" role="alert" data-note="Low-confidence state: system flags weak evidence"><strong>Low confidence</strong>${out.reasons.map(r => `<p class="small">${esc(r)}</p>`).join('')}<p class="small">Use the feedback below as hints. This result is <strong>not added</strong> to your progress.</p></div>` : ''}
          <div class="card">${ruler(out.band, S.profile.target, { label: 'Writing task' })}
            <p class="small muted">Task band = average of the four criteria below, rounded to the nearest half band.
            Writing component: <strong class="num">${fmt(comb.band)}</strong> (${comb.basis === 'both' ? `Task 1 ${fmt(S.writingTasks.task1)} &times; 1 + Task 2 ${fmt(S.writingTasks.task2)} &times; 2, divided by 3` : ({ 'task2 only': 'Task 2 only so far; do Task 1 for a full estimate', 'task1 only': 'Task 1 only so far; do Task 2 for a full estimate', 'this attempt only': 'this attempt only' })[comb.basis]}).</p></div>
          ${out.criteria.map(c => `<section class="crit" data-note="${c.code === 'TA' ? 'Band-descriptor aligned feedback' : ''}"><div class="crit-head"><div><h3>${esc(c.label)}</h3><p class="desc">${esc(c.descriptor)}</p></div><span class="bandmed">${c.band}</span></div>${fbList(c.feedback)}</section>`).join('')}
          <details data-note="Measure step: objective metrics"><summary>What the system measured</summary><div class="inner tablewrap"><table class="metrics">
            <tr><td>Words (minimum ${T.min})</td><td class="v">${m.wordCount}</td></tr><tr><td>Sentences / average length</td><td class="v">${m.sentenceCount} / ${m.avgSentenceLength.toFixed(1)}</td></tr>
            <tr><td>Paragraphs</td><td class="v">${m.paragraphCount}</td></tr><tr><td>Linking words (total / different)</td><td class="v">${m.linkerTotal} / ${m.linkerDistinct}</td></tr>
            <tr><td>Lexical diversity (moving type-token ratio)</td><td class="v">${m.lexicalDiversity.toFixed(2)}</td></tr><tr><td>Less common words (distinct, 7+ letters)</td><td class="v">${Math.round(m.sophistication * 100)}%</td></tr>
            <tr><td>Complex sentences</td><td class="v">${Math.round(m.complexRatio * 100)}%</td></tr><tr><td>Possible errors per 100 words</td><td class="v">${m.errorsPer100.toFixed(1)}</td></tr>
            <tr><td>Task points covered</td><td class="v">${out.coverage.hit.length}/${out.coverage.hit.length + out.coverage.missed.length}</td></tr></table>
            <p class="small muted">These are proxies. A human examiner judges meaning, argument quality and accuracy as a whole; counting linking words cannot tell whether they are used well.</p></div></details>
          ${model ? `<details data-note="Worked example shown only after an attempt"><summary>Compare with a model answer</summary><div class="inner"><p class="small muted">Shown after you submit, so you plan first and compare second.</p>${model.text.split(/\n+/).map(p => `<p class="small">${esc(p)}</p>`).join('')}</div></details>` : ''}
          <div class="stack-s"><button class="btn block" id="revise">Revise this answer</button><a class="btn secondary block" href="#about">How this feedback is produced</a></div>`;
        $('#revise', main).onclick = () => { st.drafts[T.key] = text; st.key = T.key; draw(); };
      };
      draw();
    }
  };

  // ================================================================== 7 SPEAKING
  routes.speaking = {
    title: 'Speaking', tab: 'practice', back: 'practice',
    render(main) {
      const SP = C.SPEAKING;
      const st = { part: 2, mode: 'type', text: '', seconds: '', qi: 0, prep: null, rec: null, audioUrl: null, consent: false, recording: false };
      let prepTimer = null, recTimer = null, mediaStream = null, recorder = null, chunks = [];
      const stopMedia = () => {
        clearInterval(prepTimer); clearInterval(recTimer);
        try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e) { }
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
        if (st.audioUrl) { URL.revokeObjectURL(st.audioUrl); st.audioUrl = null; } // recording deleted when leaving
      };
      const part = () => SP.parts.find(p => p.part === st.part);
      const draw = () => {
        const P = part();
        const prompts = P.part === 2 ? [P.cue.topic] : P.questions;
        const promptText = P.part === 2 ? `${P.cue.topic} You should say: ${P.cue.points.join(', ')}, ${P.cue.explain}` : prompts[st.qi];
        main.innerHTML = `${simBanner('Speech is not analysed: the app analyses a transcript.')}
          <div class="tabs" role="tablist">${SP.parts.map(p => `<button role="tab" data-part="${p.part}" aria-selected="${st.part === p.part}">Part ${p.part}</button>`).join('')}</div>
          <div class="stack-s"><h1>${esc(P.title)}</h1>${l1Line('speaking')}</div>
          <div class="examiner"><span class="avatar" aria-hidden="true">EX</span><div class="bubble" data-note="Authentic task: examiner prompt + caption">
            ${P.part === 2 ? `<div class="cue"><strong>${esc(P.cue.topic)}</strong><span>You should say:</span><ul>${P.cue.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul><span>${esc(P.cue.explain)}</span></div>
              <p class="small muted">1 minute to prepare, then speak for 1-2 minutes.</p>`
              : `<p>${esc(prompts[st.qi])}</p><p class="small muted">Question ${st.qi + 1} of ${prompts.length}</p>`}
            <div class="row">${TTS.ok ? '<button class="btn small secondary" id="say">Hear the examiner</button>' : ''}
              ${P.part !== 2 && prompts.length > 1 ? `<button class="btn small ghost" id="nextQ">Next question</button>` : ''}
              ${P.part === 2 ? `<button class="btn small ghost" id="prep">${st.prep != null ? `Preparing: <span class="num" id="prepT">${st.prep}</span>s` : 'Start 1-minute preparation'}</button>` : ''}</div>
          </div></div>
          <div class="tabs" role="tablist" aria-label="Answer method">${[['type', 'Type'], ['record', 'Record'], ['sample', 'Sample']].map(([k, t]) => `<button role="tab" data-mode="${k}" aria-selected="${st.mode === k}">${t}</button>`).join('')}</div>
          ${st.mode === 'record' ? recordHtml() : ''}
          ${st.mode === 'sample' ? `<div class="card"><p class="small muted">Pre-scripted Part 2 transcripts (weak, average, strong) for demonstrating the analysis. "(pause)" and "..." mark pauses.</p>
            <div class="seg">${SP.samples.map((s, i) => `<button data-sample="${i}">${s.level[0].toUpperCase() + s.level.slice(1)}</button>`).join('')}</div></div>` : ''}
          <label class="field">${st.mode === 'record' ? 'Now type what you said' : 'Your answer (transcript)'}<span class="hint">Write "(pause)" where you stopped for a long time, and keep words like "um" so fluency can be measured.</span>
            <textarea id="tx" style="min-height:160px">${esc(st.text)}</textarea></label>
          <label class="field">How long did you speak? (seconds)<input type="number" id="secs" inputmode="numeric" min="5" max="300" value="${esc(st.seconds || P.seconds)}"></label>
          <button class="btn block" id="analyse">Analyse my answer</button>`;
        bind(promptText);
      };
      const recordHtml = () => {
        const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
        if (!supported) return `<div class="state-box error"><strong>Recording is not available here.</strong><span class="small">This browser or preview blocks the microphone. Type your answer or use a sample instead.</span></div>`;
        return `<div class="card" data-note="Privacy: recording stays on device, deleted on exit">
          <label class="switch"><span class="lbl small">I understand the recording stays on this phone and is deleted when I leave this screen.</span><input type="checkbox" id="consent" ${st.consent ? 'checked' : ''}></label>
          <div class="rec ${st.recording ? 'recording' : ''}"><span class="recdot" aria-hidden="true"></span><span class="num" id="recT">${st.rec || 0}s</span>
            <button class="btn small" id="recBtn" ${st.consent ? '' : 'disabled'}>${st.recording ? 'Stop' : 'Start recording'}</button></div>
          ${st.audioUrl ? `<audio controls src="${st.audioUrl}" style="width:100%"></audio><p class="small muted">Listen back and check your word stress. Then type what you said below; the time is filled in for you.</p>` : ''}</div>`;
      };
      const bind = promptText => {
        const tx = $('#tx', main), secs = $('#secs', main);
        tx.oninput = () => { st.text = tx.value; };
        secs.oninput = () => { st.seconds = secs.value; };
        $$('[data-part]', main).forEach(b => b.onclick = () => { st.part = +b.dataset.part; st.qi = 0; st.seconds = ''; clearInterval(prepTimer); st.prep = null; TTS.stop(); draw(); });
        $$('[data-mode]', main).forEach(b => b.onclick = () => { st.mode = b.dataset.mode; draw(); });
        $$('[data-sample]', main).forEach(b => b.onclick = () => { const s = SP.samples[+b.dataset.sample]; st.part = 2; st.text = s.text; st.seconds = s.seconds; draw(); toast('Sample transcript loaded'); });
        if ($('#say', main)) $('#say', main).onclick = () => TTS.playLines([{ s: 'E', text: promptText }], { E: { pitch: 1, rate: 0.92 } });
        if ($('#nextQ', main)) $('#nextQ', main).onclick = () => { st.qi = (st.qi + 1) % part().questions.length; draw(); };
        if ($('#prep', main)) $('#prep', main).onclick = () => {
          if (st.prep != null) return;
          st.prep = 60; draw();
          prepTimer = setInterval(() => { st.prep--; const el = $('#prepT', main); if (el) el.textContent = st.prep; if (st.prep <= 0) { clearInterval(prepTimer); st.prep = null; toast('Time to speak'); draw(); } }, 1000);
        };
        if ($('#consent', main)) $('#consent', main).onchange = e => { st.consent = e.target.checked; draw(); };
        if ($('#recBtn', main)) $('#recBtn', main).onclick = async () => {
          if (st.recording) { recorder.stop(); return; }
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(mediaStream); chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
              clearInterval(recTimer); st.recording = false;
              if (st.audioUrl) URL.revokeObjectURL(st.audioUrl);
              st.audioUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
              st.seconds = st.rec; mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; draw();
            };
            recorder.start(); st.recording = true; st.rec = 0; draw();
            recTimer = setInterval(() => { st.rec++; const el = $('#recT', main); if (el) el.textContent = st.rec + 's'; if (st.rec >= 180) recorder.stop(); }, 1000);
          } catch (e) { toast('Microphone permission was refused. Type your answer instead.'); }
        };
        $('#analyse', main).onclick = analyse;
      };
      const analyse = () => {
        const P = part();
        main.innerHTML = `${simBanner()}<div class="card" aria-live="polite"><h2>Analysing your transcript</h2><div class="pipeline">
          ${[['1', 'Measure', 'Speech rate, fillers, pauses, sentence variety'], ['2', 'Judge', 'Matching to speaking band-descriptor statements'], ['3', 'Combine', 'Weighting into four criterion bands']]
            .map(([n, t, d], i) => `<div class="pipe-step" id="ps${i}"><span class="dot">${n}</span><div><strong>${t}</strong><p class="small muted">${d}</p></div></div>`).join('')}</div></div>`;
        const out = E.scoreSpeaking(st.text, st.seconds || P.seconds, P);
        const delay = S.settings.lowData || S.settings.motion ? 150 : 420;
        [0, 1, 2].forEach(i => setTimeout(() => { const el = $('#ps' + i, main); if (el) el.classList.add('on', 'done'); }, delay * (i + 1)));
        setTimeout(() => showResult(out), delay * 4);
      };
      const showResult = out => {
        if (out.status === 'error') {
          main.innerHTML = `${simBanner()}<div class="state-box error" role="alert"><h2>Not enough to analyse</h2><p>${esc(out.message)}</p><button class="btn" id="back">Back to the question</button></div>`;
          $('#back', main).onclick = draw; return;
        }
        recordBand('speaking', out.band, `Part ${st.part}`);
        const m = out.metrics;
        main.innerHTML = `${simBanner()}
          <div class="stack-s"><p class="eyebrow">Part ${st.part} feedback</p><div class="row-between"><h1>Estimated band <span class="num">${fmt(out.band)}</span></h1><span class="chip ${out.confidence === 'low' ? 'bad' : 'warn'}">${out.confidence} confidence</span></div></div>
          <div class="card">${ruler(out.band, S.profile.target, { label: 'Speaking' })}
            <div class="grid2 small"><div><span class="muted">Speech rate</span><br><strong class="num">${Math.round(m.wpm)} wpm</strong></div><div><span class="muted">Fillers</span><br><strong class="num">${m.fillers}</strong></div>
            <div><span class="muted">Long pauses</span><br><strong class="num">${m.pauseMarkers}</strong></div><div><span class="muted">Complex sentences</span><br><strong class="num">${Math.round(m.complexRatio * 100)}%</strong></div></div></div>
          ${out.criteria.map(c => `<section class="crit" ${c.lowConfidence ? 'data-note="Honest limits: pronunciation not measured"' : ''}><div class="crit-head"><div><h3>${esc(c.label)}</h3><p class="desc">${esc(c.descriptor)}</p></div>
            <div style="text-align:right"><span class="bandmed">${c.band}</span>${c.lowConfidence ? '<br><span class="chip sim">not measured</span>' : ''}</div></div>${fbList(c.feedback)}</section>`).join('')}
          <div class="card flat small"><strong>Practise with a person too</strong><p class="muted">Ask a study partner or teacher to listen to your recording. Interaction and pronunciation need a human listener.</p></div>
          <button class="btn block" id="again">Try again</button>`;
        $('#again', main).onclick = draw;
      };
      draw();
      return () => { stopMedia(); TTS.stop(); };
    }
  };

  // ================================================================== 8 PROGRESS
  routes.progress = {
    title: 'Progress', tab: 'progress',
    render(main) {
      const b = S.bands, ov = E.overallBand(b);
      const hist = S.history;
      // trend chart
      const W = 320, H = 170, pl = 26, pr = 10, pt = 10, pb = 22;
      const maxN = Math.max(2, ...SKILLS.map(s => hist.filter(h => h.skill === s).length));
      const x = i => pl + (i / (maxN - 1)) * (W - pl - pr), y = v => pt + (1 - (v - 3) / 6) * (H - pt - pb);
      const shapes = { listening: 'circle', reading: 'square', writing: 'diamond', speaking: 'triangle' };
      const marker = (s, cx, cy) => { cx = +cx; cy = +cy; return shapes[s] === 'circle' ? `<circle class="sk-${s}" cx="${cx}" cy="${cy}" r="3.5"/>` : shapes[s] === 'square' ? `<rect class="sk-${s}" x="${cx - 3.2}" y="${cy - 3.2}" width="6.4" height="6.4"/>`
        : shapes[s] === 'diamond' ? `<path class="sk-${s}" d="M${cx} ${cy - 4.5}L${cx + 4.5} ${cy}L${cx} ${cy + 4.5}L${cx - 4.5} ${cy}Z"/>` : `<path class="sk-${s}" d="M${cx} ${cy - 4.5}L${cx + 4.5} ${cy + 4}L${cx - 4.5} ${cy + 4}Z"/>`; };
      let grid = '';
      for (let v = 3; v <= 9; v++) grid += `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
      const tgt = S.profile.target;
      grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(tgt)}" y2="${y(tgt)}" style="stroke:var(--saffron);stroke-dasharray:4 3;stroke-width:1.5"/><text x="${W - pr}" y="${y(tgt) - 4}" text-anchor="end" style="fill:var(--saffron)">target</text>`;
      const lines = SKILLS.map(s => {
        const pts = hist.filter(h => h.skill === s).map(h => h.band);
        if (!pts.length) return '';
        const d = pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(Math.max(3, v)).toFixed(1)).join(' ');
        return `<path class="sk-${s}" d="${d}" style="fill:none"/>${pts.map((v, i) => marker(s, x(i).toFixed(1), y(Math.max(3, v)).toFixed(1))).join('')}`;
      }).join('');
      // weak areas
      const weak = [];
      const tn = { TFNG: 'Reading: True / False / Not Given', MCQ: 'Multiple choice', COMPLETION: 'Reading: sentence completion', FORM: 'Listening: form completion' };
      Object.entries(S.typeStats).forEach(([skill, types]) => Object.entries(types).forEach(([t, v]) => {
        if (v.total >= 3) weak.push({ label: t === 'MCQ' ? `${SKILL_LABEL[skill]}: multiple choice` : tn[t] || t, pct: v.correct / v.total, href: '#' + skill, skill });
      }));
      SKILLS.forEach(s => { if (typeof b[s] === 'number' && b[s] < tgt) weak.push({ label: `${SKILL_LABEL[s]} band below target`, pct: null, gap: tgt - b[s], href: '#' + s, skill: s }); });
      weak.sort((a, b2) => (a.pct == null ? 1 - a.gap / 4 : a.pct) - (b2.pct == null ? 1 - b2.gap / 4 : b2.pct));
      const recFor = w => ({ reading: 'Do the passage in practice mode and use "Show paragraph" before checking.', listening: 'Turn captions off and predict answer types before you press Play.', writing: 'Write Task 2 with the planner open, then revise using the feedback.', speaking: 'Record a Part 2 answer, listen back, and cut fillers.' }[w.skill]);
      main.innerHTML = `<h1>Progress</h1>
        <div class="card" data-note="Overall band: average rounded to nearest half"><div class="row-between"><div><p class="small muted">Estimated overall</p><p class="bandbig">${ov ? fmt(ov.band) : '-'}</p></div><div style="text-align:right"><p class="small muted">Target</p><p class="bandmed">${fmt(tgt)}</p></div></div>
          ${ov ? `<p class="small muted num">(${SKILLS.map(s => fmt(b[s])).join(' + ')}) / 4 = ${ov.average.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} &rarr; ${fmt(ov.band)}</p><p class="small muted">Averages ending in .25 round up to the next half band and .75 rounds up to the next whole band, as in the real test.</p>` : '<p class="small">Complete all four skills for an overall estimate.</p>'}</div>
        <section class="card trend" aria-labelledby="th" data-note="Analytics: band trend per skill"><h2 id="th">Band trend</h2>
          ${hist.length ? `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Band trend by attempt for each skill">${grid}${lines}<text x="${pl}" y="${H - 4}">attempts &rarr;</text></svg>
          <div class="legend">${SKILLS.map(s => `<span><svg width="12" height="12" viewBox="-6 -6 12 12">${marker(s, 0, 0)}</svg>${SKILL_LABEL[s]} <span class="num">${fmt(b[s])}</span></span>`).join('')}</div>` : '<p class="muted">Your trend appears after your first practice.</p>'}</section>
        <section class="card" aria-labelledby="wh" data-note="Weak-area diagnosis + next activities"><h2 id="wh">Focus areas</h2>
          ${weak.length ? weak.slice(0, 4).map(w => `<div class="weak"><div class="stack-s" style="gap:2px"><strong>${esc(w.label)}</strong><span class="small muted">${esc(recFor(w))}</span></div>
            <a class="btn small" href="${w.href}">${w.pct != null ? Math.round(w.pct * 100) + '%' : 'Practise'}</a></div>`).join('') : '<p class="muted">No weak areas yet. Do a few practice sets.</p>'}</section>
        <details><summary>Recent activity</summary><div class="inner tablewrap"><table class="metrics"><tr><th>Date</th><th>Skill</th><th>Band</th><th>Detail</th></tr>
          ${hist.slice(-10).reverse().map(h => `<tr><td class="num">${h.date.slice(5, 10)}</td><td>${SKILL_LABEL[h.skill]}</td><td class="v">${fmt(h.band)}</td><td class="small">${esc(h.detail)}</td></tr>`).join('')}</table></div></details>`;
    }
  };

  // ================================================================== VOCAB (spaced repetition)
  function dueCount() { const now = Date.now(); return C.VOCAB.filter(v => !S.vocab[v.w] || S.vocab[v.w].due <= now).length; }
  routes.vocab = {
    title: 'Vocabulary', tab: 'practice', back: 'practice',
    render(main) {
      const INTERVAL = [0, 1, 3, 7]; // days for boxes 1-3
      const queue = () => C.VOCAB.filter(v => !S.vocab[v.w] || S.vocab[v.w].due <= Date.now());
      let flipped = false;
      const draw = () => {
        const q = queue();
        const counts = [1, 2, 3].map(bx => C.VOCAB.filter(v => (S.vocab[v.w] ? S.vocab[v.w].box : 1) === bx).length);
        const card = q[0];
        main.innerHTML = `<div class="stack-s"><h1>Vocabulary review</h1><p class="muted small">Words from your practice sets. Words you know come back less often.</p></div>
          <div class="boxes" data-note="Cognitivist: spaced retrieval (Leitner boxes)">${['New / again', 'In 3 days', 'In 7 days'].map((t, i) => `<div><b>${counts[i]}</b>${t}</div>`).join('')}</div>
          ${card ? `<button class="flash" id="flash" aria-live="polite">${flipped ? `<span class="w">${esc(card.w)}</span><span>${esc(card.d)}</span><span class="muted small"><em>${esc(card.ex)}</em></span>`
            : `<span class="muted small">Recall the meaning, then tap to check</span><span class="w">${esc(card.w)}</span>`}</button>
            <div class="grid2"><button class="btn secondary" id="no" ${flipped ? '' : 'disabled'}>Not yet</button><button class="btn" id="yes" ${flipped ? '' : 'disabled'}>I knew it</button></div>
            <p class="small muted">${q.length} due now</p>`
            : `<div class="card"><h2>All done for today</h2><p class="muted">Come back tomorrow for the next words.</p><a class="btn" href="#home">Back to today's plan</a></div>`}`;
        if (!card) return;
        $('#flash', main).onclick = () => { flipped = !flipped; draw(); };
        const rate = ok => {
          const cur = S.vocab[card.w] || { box: 1 };
          const box = ok ? Math.min(3, cur.box + 1) : 1;
          S.vocab[card.w] = { box, due: Date.now() + INTERVAL[box] * 86400000 * (ok ? 1 : 0) + (ok ? 0 : 60000) };
          flipped = false; if (!queue().length) markActivity('vocab'); save(); draw();
        };
        $('#no', main).onclick = () => rate(false); $('#yes', main).onclick = () => rate(true);
      };
      draw();
    }
  };

  // ================================================================== SETTINGS / ACCESSIBILITY
  routes.settings = {
    title: 'Settings', tab: 'settings',
    render(main) {
      const st = S.settings;
      const sw = (id, label, sub, on) => `<label class="switch"><span class="lbl">${label}<small>${sub}</small></span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;
      main.innerHTML = `<h1>Settings</h1>
        <section class="card" aria-labelledby="ah" data-note="Accessibility: WCAG 2.2 settings"><h2 id="ah">Reading comfort</h2>
          <div class="stack-s"><strong id="tsl">Text size</strong><div class="seg" role="group" aria-labelledby="tsl">${[['s', 'Small'], ['m', 'Default'], ['l', 'Large'], ['xl', 'Extra large']].map(([v, t]) => `<button data-text="${v}" aria-pressed="${st.text === v}">${t}</button>`).join('')}</div></div>
          <div class="stack-s"><strong id="thl">Theme</strong><div class="seg" role="group" aria-labelledby="thl">${[['system', 'Phone setting'], ['light', 'Light'], ['dark', 'Dark']].map(([v, t]) => `<button data-theme="${v}" aria-pressed="${st.theme === v}">${t}</button>`).join('')}</div></div>
          ${sw('contrast', 'High contrast', 'Black text on white with stronger borders', st.contrast)}
          ${sw('motion', 'Reduce motion', 'Turns off animations', st.motion)}</section>
        <section class="card" aria-labelledby="dh"><h2 id="dh">Data and language</h2>
          ${sw('lowData', 'Low-data mode', 'Shorter animations and no optional extras. Listening already uses the phone voice, so audio needs no download.', st.lowData)}
          <label class="field">Instruction language<select id="l1">${[['si', 'Sinhala (සිංහල)'], ['ta', 'Tamil (தமிழ்)'], ['en', 'English only'], ['other', 'English only (other first language)']].map(([v, t]) => `<option value="${v}" ${S.profile.l1 === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          ${sw('l1Help', 'Show instructions in my language', 'A short line under the English instruction', S.profile.l1Help)}
          <p class="small muted">App size: about 180 KB. Once loaded, it works offline when hosted over https.</p></section>
        <section class="card" aria-labelledby="ph"><h2 id="ph">Study profile</h2>
          <div class="stack-s"><strong id="tvl">Test version</strong><div class="seg" role="group" aria-labelledby="tvl">${[['academic', 'Academic'], ['general', 'General Training']].map(([v, t]) => `<button data-mod="${v}" aria-pressed="${S.profile.module === v}">${t}</button>`).join('')}</div></div>
          <a class="btn secondary" href="#onboarding">Edit goal, exam date and study time</a></section>
        <section class="card" aria-labelledby="xh"><h2 id="xh">For the project team</h2>
          ${sw('annotate', 'Show design annotations', 'Labels features with the theory behind them, for report screenshots', st.annotate)}
          <a class="btn ghost" href="#about">About the simulated AI and privacy</a></section>
        <section class="card" aria-labelledby="rh"><h2 id="rh">Your data</h2><p class="small muted">Stored only in this browser: ${S.history.length} practice results.</p>
          <div id="delWrap"><button class="btn secondary" id="del">Delete all my data</button></div></section>`;
      $$('[data-text]', main).forEach(b => b.onclick = () => { st.text = b.dataset.text; save(); applySettings(); routes.settings.render(main); });
      $$('[data-theme]', main).forEach(b => b.onclick = () => { st.theme = b.dataset.theme; save(); applySettings(); routes.settings.render(main); });
      $$('[data-mod]', main).forEach(b => b.onclick = () => { S.profile.module = b.dataset.mod; save(); routes.settings.render(main); toast('Test version updated'); });
      ['contrast', 'motion', 'lowData', 'annotate'].forEach(k => $('#' + k, main).onchange = e => { st[k] = e.target.checked; save(); applySettings(); });
      $('#l1Help', main).onchange = e => { S.profile.l1Help = e.target.checked; save(); };
      $('#l1', main).onchange = e => { S.profile.l1 = e.target.value; save(); toast('Instruction language updated'); };
      $('#del', main).onclick = () => {
        $('#delWrap', main).innerHTML = `<div class="state-box error"><strong>Delete everything?</strong><span class="small">Your profile, scores and streak will be removed from this phone. This cannot be undone.</span>
          <div class="row"><button class="btn" id="delYes">Delete</button><button class="btn secondary" id="delNo">Cancel</button></div></div>`;
        $('#delNo', main).onclick = () => routes.settings.render(main);
        $('#delYes', main).onclick = () => { try { localStorage.removeItem(KEY); } catch (e) { } load(); applySettings(); toast('All data deleted'); go('onboarding'); };
      };
    }
  };

  // ================================================================== ABOUT THE SIMULATED AI
  routes.about = {
    title: 'About the AI', tab: 'settings', back: 'settings',
    render(main) {
      const rows = [
        ['Reading and Listening scoring', 'Answer key in code; raw score scaled to 40 and converted with ielts.org anchor points', 'Same answer-key scoring with full 40-question tests', 'Check conversions against each test version’s published table'],
        ['Measure (Writing)', 'Word, sentence and paragraph counts, linking words, lexical diversity, error patterns in JavaScript', 'NLP pipeline: tokeniser, grammar-error detection model, spell checker', 'Compare metric values with teacher annotations on 50+ scripts'],
        ['Measure (Speaking)', 'Learner types or selects a transcript; rate, fillers and pauses counted from text', 'Speech recognition with timestamps; acoustic pause and pitch analysis', 'Word error rate on Sri Lankan-accented English recordings'],
        ['Judge', 'Statements chosen from a pre-written bank by metric thresholds', 'Large language model prompted with the public band descriptors', 'Two trained teachers rate the same scripts; measure agreement'],
        ['Combine', 'Weighted rules blended with a holistic index', 'Trained scoring model (regression on rated scripts)', 'Target: 90% of scores within half a band of the teacher average'],
        ['Pronunciation', 'Not measured; copied from Fluency and labelled', 'Phoneme-level pronunciation assessment model', 'Test across Sinhala and Tamil speakers to check for accent bias']
      ];
      main.innerHTML = `<h1>About the simulated AI</h1>${simBanner()}
        <section class="card"><h2>What the AI may do</h2><ul class="allow small"><li>Give formative feedback on practice answers, linked to the four public criteria.</li><li>Suggest what to practise next.</li><li>Show an estimated band with a confidence level.</li><li>Say when it is unsure (short or off-topic answers).</li></ul></section>
        <section class="card"><h2>What it must not do</h2><ul class="allow small"><li>Present any band as an official IELTS score or a prediction of a test result.</li><li>Replace a teacher's judgement on argument quality, pronunciation or interaction.</li><li>Store or upload voice recordings.</li><li>Write answers for the learner. Model answers appear only after an attempt.</li></ul></section>
        <section class="card"><h2>From prototype to production</h2><div class="tablewrap"><table class="pipe"><tr><th>Step</th><th>In this prototype</th><th>In production</th><th>Calibration</th></tr>
          ${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>
          <p class="small muted">Calibration so far: the rules were tuned on nine reference-rated samples. Agreement within half a band rose from 44% to 100% on those samples. This is in-sample agreement only; a real study needs new scripts rated by trained teachers.</p></section>
        <section class="card"><h2>Privacy</h2><p class="small">Everything stays in this browser's storage. There are no accounts, no analytics and no server. Recordings exist only in memory and are deleted when you leave the Speaking screen. A production version would need consent and data-retention rules under Sri Lanka's Personal Data Protection Act, No. 9 of 2022.</p></section>
        <section class="card"><h2>Sources</h2><p class="small">Band conversion anchor points and the overall rounding rule: ielts.org, "IELTS scoring in detail" (accessed 15 October 2026). All practice content is original to this prototype.</p></section>`;
    }
  };

  // ------------------------------------------------------------------ boot
  applySettings();
  render();
  // Offline support where the host allows service workers (e.g. GitHub Pages over https).
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { }
})();
