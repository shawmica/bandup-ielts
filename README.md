# BandUp: AI-assisted IELTS practice (prototype)

ICT4201 E-Learning, Assignment 02, Group NN.
A mobile-first web app prototype for Sri Lankan IELTS candidates. It has diagnostic placement, a personalised daily plan, practice for all four skills, and a **clearly labelled simulated AI** that mirrors a Measure → Judge → Combine → Calibrate scoring pipeline.

> Prototype: simulated AI. No live AI service is called. All feedback comes from rules and a pre-written feedback bank running in the browser. Bands are practice estimates, not official IELTS scores.

## Run it

No build step and no dependencies.

```bash
# from this folder
python3 -m http.server 8000
# then open http://localhost:8000 (or your laptop's IP from a phone on the same Wi-Fi)
```

Opening `index.html` directly from disk also works, but offline caching (service worker) needs http(s).

## Deploy (GitHub Pages)

1. Create a public repository and push this folder to `main`.
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The URL will be `https://<user>.github.io/<repo>/`. Put it, with a QR code, on the report cover.
4. After submission, tag the version: `git tag v1.0-submitted && git push --tags`. Do not change the live site after the deadline.

Netlify or Cloudflare Pages also work: drag and drop the folder.

## Screens (minimum scope 4.2)

| # | Screen | Route | Notes |
|---|--------|-------|-------|
| 1 | Onboarding and profile | `#onboarding` | Test version, purpose, target band, exam date, study minutes, first language, low-data mode |
| 2 | Diagnostic placement test | `#diagnostic` | 4 reading + 4 listening items, short writing and speaking tasks, then a per-skill estimate and plan |
| 3 | Home dashboard | `#home` | Overall estimate vs target, streak, today's plan (minutes allocated by gap to target), skill tiles |
| 4 | Reading practice | `#reading` | 10 questions (TFNG, MCQ, sentence completion); instant feedback, hint after first wrong try, "Show paragraph" evidence, exam mode |
| 5 | Listening practice | `#listening` | Device text-to-speech audio (no download), play limit, captions toggle, prediction hints, transcript unlocked after submitting |
| 6 | Writing practice with AI feedback | `#writing` | Task 1 (Academic chart or GT letter) and Task 2; four criterion bands; metrics; error and low-confidence states |
| 7 | Speaking practice with AI | `#speaking` | Parts 1-3, examiner prompts read aloud, type / record / sample transcript, four criterion bands |
| 8 | Progress and analytics | `#progress` | Overall calculation, band trend per skill, weak-area diagnosis, recommended next activities |
| + | Vocabulary review | `#vocab` | Spaced repetition (Leitner boxes, 1/3/7 days) |
| + | Settings and accessibility | `#settings` | Text size, theme, high contrast, reduced motion, low-data mode, Sinhala/Tamil instructions, delete data |
| + | About the simulated AI | `#about` | Allowed / not allowed, production replacement table, privacy |

## File structure

```
index.html            app shell (top bar, bottom tab bar)
css/styles.css        all styles; system fonts only (low data)
js/content.js         ORIGINAL practice content, learning objectives, sample answers
js/engine.js          scoring: answer key, band conversion, Measure/Judge/Combine, calibration
js/app.js             screens and routing
sw.js                 offline cache (about 180 KB total)
manifest.webmanifest  install-to-home-screen metadata
tests/calibrate.js    unit checks + calibration table (node tests/calibrate.js -v)
```

## How the simulated AI works (spec 4.3)

**Reading and Listening are real auto-scoring, not AI.** Answers are checked against a fixed key. Spelling near-misses and word-limit breaks count as wrong and are labelled. The raw score out of 10 is scaled to 40 and converted with the official anchor points from ielts.org, *IELTS scoring in detail* (accessed 21 October 2026):

| Band | Listening | Academic Reading | General Training Reading |
|------|-----------|------------------|--------------------------|
| 8 | 35 | 35 | - |
| 7 | 30 | 30 | 35 |
| 6 | 23 | 23 | 30 |
| 5 | 16 | 15 | 23 |
| 4 | - | - | 15 |

The official page gives only these anchor points. Half bands between them, and values above the top anchor, are the app's linear interpolation, and the result screen says so.

**Writing** (`Engine.scoreWriting`)

1. **Measure:** word count against the minimum, sentences and average length, paragraphs, linking words (total, distinct, per 100 words), referencing words, lexical diversity (moving type-token ratio, window 50), less-common-word ratio, complex-sentence ratio, a list of common learner error patterns, and coverage of task points.
2. **Judge:** a descriptor-style statement for each criterion band, plus targeted feedback items chosen from the feedback bank by metric thresholds. A "holistic index" stands in for a language model's overall judgement.
3. **Combine:** each criterion proxy is a weighted rule, blended 50/50 with the holistic index and rounded to a whole band. The task band is the mean of the four criteria, rounded to the nearest half band. The Writing component is (Task 1 + 2 × Task 2) / 3.
4. **Confidence:** the result is **low** when the answer is under 60% of the minimum or covers fewer than 40% of the task points. Low-confidence results are shown but not saved to progress. Under 40 words gives an error state with no band.

**Speaking** (`Engine.scoreSpeaking`). The learner types, records-then-types, or picks a sample transcript. The app measures words per minute, filler words, pause markers (`(pause)` or `...`), discourse markers, sentence variety, errors and cue-card coverage. Pronunciation cannot be measured from text, so it copies Fluency and is labelled **not measured**.

**Overall band** is the mean of the four skills, rounded to the nearest half band (.25 rounds up to .5 and .75 rounds up to the next whole band). It is checked in `tests/calibrate.js`.

## Calibration record (for Part 6)

`node tests/calibrate.js` compares the engine with reference ratings of the nine sample responses in `content.js`.

| Version | Agreement within 0.5 band | Mean absolute difference |
|---------|---------------------------|--------------------------|
| v0 (first rules: surface counts only) | 44% (4/9) | 0.94 |
| v1 (task-specific anchors + holistic index) | 100% (9/9) | 0.28 |

**Limitation:** the reference ratings were set by the authors of the samples, and the rules were tuned on the same nine samples. This is in-sample agreement only. Before any real use:

- have a trained IELTS teacher rate new scripts;
- run the engine on them without retuning;
- report the agreement.

## Things the group must check before submitting

- [ ] **Sinhala and Tamil instruction lines** (`I18N` in `js/content.js`) were machine-drafted. Ask a native speaker to check them.
- [ ] Proofread all practice content (passage, script, prompts, sample answers) and confirm every answer key.
- [ ] Replace the `teacherBand` reference values with ratings from a teacher if you can, and re-run the calibration.
- [ ] Test on at least one real Android phone (Chrome). Text-to-speech voices vary by device. On phones with no English voice, the listening screen falls back to a "read the script" mode.
- [ ] Declare AI assistance in the AI-use declaration. This prototype's code and draft content were generated with Claude (Anthropic) and must be listed with what you changed and verified.
- [ ] Change `Group NN` in this README.

## Capturing the required screenshots

- Use Chrome DevTools device mode at 390 × 844, or a real phone.
- **Settings → Show design annotations** adds a labelled outline to key features, such as "Behaviorist: streak (positive reinforcement)" and "Constructivist: hint before answer (scaffold)". Use it for the annotated screenshots, or add your own callouts.
- AI states:
  - input: the Writing screen;
  - processing: the pipeline animation right after "Get feedback";
  - output: the feedback screen;
  - error: submit fewer than 40 words;
  - low confidence: submit an off-topic text of 100 or so words.
- Accessibility:
  - Settings at Extra large text;
  - high contrast;
  - Listening with captions on;
  - the transcript after submitting.

## Privacy

- No accounts, analytics or server. Profile and results are stored in the browser's `localStorage` and can be deleted in Settings.
- Speaking recordings stay in memory only (object URL). They are revoked when the learner leaves the screen and are never uploaded.
