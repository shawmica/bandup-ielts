/*
 * BandUp IELTS practice prototype - original practice content.
 * All passages, scripts, prompts and sample answers were written for this
 * prototype (AI-assisted drafting, reviewed by the group - see AI-use declaration).
 * Nothing here is copied from official IELTS, Cambridge, British Council or IDP material.
 * Every item carries an `lo` field that links it to a learning objective (LO code in OBJECTIVES).
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- objectives
  // 12 measurable objectives, 3 per skill, across 5 Bloom levels.
  const OBJECTIVES = {
    'R1': { skill: 'reading', bloom: 'Remember', verb: 'Locate', text: 'Locate specific details in a 600-word academic passage within 2 minutes per question.' },
    'R2': { skill: 'reading', bloom: 'Understand', verb: 'Distinguish', text: 'Distinguish TRUE, FALSE and NOT GIVEN statements with at least 75% accuracy.' },
    'R3': { skill: 'reading', bloom: 'Analyze', verb: 'Infer', text: "Infer a writer's purpose or a cause-effect link from evidence in a paragraph." },
    'L1': { skill: 'listening', bloom: 'Remember', verb: 'Record', text: 'Record names, numbers and spellings from a conversation with correct format.' },
    'L2': { skill: 'listening', bloom: 'Understand', verb: 'Identify', text: 'Identify the correct answer when a speaker corrects or changes information (distractors).' },
    'L3': { skill: 'listening', bloom: 'Apply', verb: 'Apply', text: 'Apply prediction strategies to anticipate the type of answer before listening.' },
    'W1': { skill: 'writing', bloom: 'Apply', verb: 'Organise', text: 'Organise a Task 2 essay into introduction, two body paragraphs and conclusion.' },
    'W2': { skill: 'writing', bloom: 'Analyze', verb: 'Compare', text: 'Compare and summarise the main trends in a chart in at least 150 words with a clear overview.' },
    'W3': { skill: 'writing', bloom: 'Evaluate', verb: 'Justify', text: 'Justify a clear position on an issue with reasons and relevant examples in at least 250 words.' },
    'S1': { skill: 'speaking', bloom: 'Understand', verb: 'Describe', text: 'Describe familiar topics in Part 1 with extended answers of 2-3 sentences.' },
    'S2': { skill: 'speaking', bloom: 'Create', verb: 'Produce', text: 'Produce a 1-2 minute talk that covers every point on a cue card.' },
    'S3': { skill: 'speaking', bloom: 'Evaluate', verb: 'Evaluate', text: 'Evaluate an abstract issue in Part 3, giving reasons and a balanced view.' }
  };

  // ---------------------------------------------------------------- reading
  const READING = {
    id: 'reading-mangroves',
    title: 'Rebuilding the Coastline',
    subtitle: 'The return of mangrove forests',
    minutes: 20,
    paragraphs: [
      ['A', 'For much of the twentieth century, mangrove forests were treated as wasteland. Along tropical coasts, the dense, salt-tolerant trees were cleared to make way for shrimp ponds, tourist resorts and roads. Some researchers have estimated that around a third of the world’s mangroves disappeared over roughly fifty years. Today, however, many coastal communities are trying to bring them back, and their reasons are as much economic as environmental.'],
      ['B', 'Mangroves grow in the narrow zone between land and sea, where few other trees can survive. Their tangled roots slow down incoming waves and trap mud carried by rivers. Over time, this mud builds up, so a healthy mangrove forest can actually raise the level of the land behind it. Some coastal engineers now describe mangroves as living sea walls because, unlike concrete barriers, they can repair themselves after storms and keep pace with gradually rising seas.'],
      ['C', 'The forests also support fishing. Many species of fish and crab spend the early part of their lives sheltering among the roots before moving into open water. In one study of a small fishing village, families who fished near restored mangroves reported larger catches within five years of replanting. The researchers warned, however, that the weather and local fishing rules had also changed during that period, so the trees could not be given all the credit.'],
      ['D', 'Early restoration projects were often disappointing. In the 1990s, many organisations simply planted large numbers of seedlings in long, neat rows on open mudflats. Planting was easy to measure and looked impressive in photographs, but survival rates were frequently below 20 percent. The seedlings had been placed where the ground stayed flooded for too long each day, or where the soil was too salty, and most of them died within two years.'],
      ['E', 'More recent projects take a different approach, sometimes called ecological restoration. Instead of starting with planting, teams first investigate why the mangroves disappeared. Often the cause is a blocked channel or an old pond wall that stops tidal water from flowing naturally. When the water flow is repaired, seeds carried by the tide frequently settle and grow without any human planting at all. Planting is then used only to fill gaps. This method is slower to show results, but survival rates are much higher, and the forests that develop contain a wider variety of species.'],
      ['F', 'Local involvement has proved equally important. Projects managed entirely by outside agencies tend to fail once their funding ends, because nobody remains to protect the young trees from cattle or illegal cutting. Where villagers help to choose sites and share in the benefits, such as income from crab farming or eco-tourism, the forests are far more likely to survive. Some programmes now pay residents a small amount for each year that a restored area remains healthy, rather than for the number of trees planted.'],
      ['G', 'Mangrove restoration is neither cheap nor simple. It requires patience, careful study of tides and soils, and long-term agreements with landowners. Nevertheless, as governments look for ways to protect coastlines from storms while also supporting local livelihoods, the humble mangrove is increasingly seen not as wasteland but as valuable natural infrastructure.']
    ],
    groups: [
      { type: 'TFNG', label: 'Questions 1-4', instruction: 'Do the following statements agree with the information in the passage? Choose TRUE, FALSE or NOT GIVEN.' },
      { type: 'MCQ', label: 'Questions 5-7', instruction: 'Choose the correct letter, A, B, C or D.' },
      { type: 'COMPLETION', label: 'Questions 8-10', instruction: 'Complete the sentences. Choose NO MORE THAN TWO WORDS from the passage for each answer.' }
    ],
    questions: [
      { n: 1, type: 'TFNG', lo: 'R2', prompt: 'Mangroves were once generally regarded as land of little value.', answer: 'TRUE', para: 'A',
        hint: 'Look at how paragraph A describes the way mangroves were treated in the past.',
        explain: 'Paragraph A says mangroves "were treated as wasteland", which matches "land of little value".' },
      { n: 2, type: 'TFNG', lo: 'R2', prompt: 'Concrete sea walls are cheaper to build than restoring mangrove forests.', answer: 'NOT GIVEN', para: 'B',
        hint: 'Paragraph B compares mangroves with concrete barriers. Does it compare their cost?',
        explain: 'Paragraph B compares how mangroves and concrete barriers behave after storms, but the passage never compares their cost.' },
      { n: 3, type: 'TFNG', lo: 'R2', prompt: 'The researchers in the fishing village were certain that the mangroves caused the larger catches.', answer: 'FALSE', para: 'C',
        hint: 'Read the last sentence of paragraph C carefully.',
        explain: 'Paragraph C says the researchers warned that weather and fishing rules had also changed, so the trees "could not be given all the credit". They were not certain.' },
      { n: 4, type: 'TFNG', lo: 'R2', prompt: 'Most of the seedlings planted on open mudflats in the 1990s died.', answer: 'TRUE', para: 'D',
        hint: 'Paragraph D gives a survival rate and says what happened to the seedlings.',
        explain: 'Paragraph D reports survival rates below 20 percent and says "most of them died within two years".' },
      { n: 5, type: 'MCQ', lo: 'R1', prompt: 'According to paragraph B, a mangrove forest can raise the level of the land because its roots',
        options: ['grow taller than other coastal trees', 'trap mud carried by rivers', 'absorb large amounts of sea water', 'are planted on top of sea walls'], answer: 1, para: 'B',
        hint: 'Find what the roots do in paragraph B, then what happens "over time".',
        explain: 'Paragraph B: the roots "trap mud carried by rivers" and this mud builds up, raising the land.' },
      { n: 6, type: 'MCQ', lo: 'R3', prompt: 'Why did many early restoration projects fail?',
        options: ['The seedlings were eaten by cattle.', 'The seedlings were planted in unsuitable conditions.', 'Funding for the projects ended too early.', 'The wrong species of mangrove was chosen.'], answer: 1, para: 'D',
        hint: 'Paragraph D explains where the seedlings were placed.',
        explain: 'Paragraph D says the ground was flooded for too long or the soil was too salty, so the conditions were unsuitable. Cattle and funding are mentioned in paragraph F, about a different problem.' },
      { n: 7, type: 'MCQ', lo: 'R3', prompt: 'What is the first step in ecological restoration?',
        options: ['Planting seedlings in neat rows', 'Paying local residents to protect the area', 'Finding out why the mangroves were lost', 'Building new walls around old ponds'], answer: 2, para: 'E',
        hint: 'Paragraph E says what teams do "instead of starting with planting".',
        explain: 'Paragraph E: "teams first investigate why the mangroves disappeared".' },
      { n: 8, type: 'COMPLETION', lo: 'R1', prompt: 'When the flow of tidal water is repaired, ______ carried by the tide often settle and grow.', answer: ['seeds'], para: 'E',
        hint: 'One word in paragraph E. What does the tide carry?',
        explain: 'Paragraph E: "seeds carried by the tide frequently settle and grow".' },
      { n: 9, type: 'COMPLETION', lo: 'R1', prompt: 'Projects run only by outside agencies often fail when their ______ ends.', answer: ['funding'], para: 'F',
        hint: 'Paragraph F, first two sentences.',
        explain: 'Paragraph F: projects "tend to fail once their funding ends".' },
      { n: 10, type: 'COMPLETION', lo: 'R1', prompt: 'Some programmes pay residents for each year that a restored area stays ______.', answer: ['healthy'], para: 'F',
        hint: 'Paragraph F, last sentence. "Remains" is a synonym of "stays".',
        explain: 'Paragraph F: "for each year that a restored area remains healthy".' }
    ],
    vocab: ['salt-tolerant', 'restoration', 'livelihood', 'infrastructure', 'seedling', 'survival rate']
  };

  // ---------------------------------------------------------------- listening
  // `say` overrides `text` for the speech engine (numbers and spellings read naturally).
  const LISTENING = {
    id: 'listening-community-centre',
    title: 'Registering for an evening class',
    context: 'Part 1 style. You will hear a man phoning a community centre to join a course.',
    speakers: { R: { name: 'Receptionist', pitch: 1.15, rate: 0.95 }, C: { name: 'Caller', pitch: 0.8, rate: 0.95 } },
    script: [
      { s: 'R', text: 'Good morning, Lakeside Community Centre. How can I help you?' },
      { s: 'C', text: "Hi. I saw a poster about your evening classes and I'd like to sign up for one." },
      { s: 'R', text: 'Of course. Which class are you interested in?' },
      { s: 'C', text: 'The photography course for beginners.' },
      { s: 'R', text: "Lovely. That one used to run on Mondays, but this term it's moved to Tuesday evenings, from six to eight." },
      { s: 'C', text: 'Tuesday is fine for me.' },
      { s: 'R', text: "Great. Let me take your details. What's your name, please?" },
      { s: 'C', text: "It's Daniel Fernando." },
      { s: 'R', text: 'Could you spell your surname for me?' },
      { s: 'C', text: 'Yes, it\'s F-E-R-N-A-N-D-O.', say: "Yes, it's F. E. R. N. A. N. D. O." },
      { s: 'R', text: 'Thank you. And a contact number?' },
      { s: 'C', text: 'My mobile is 0771 486 392.', say: 'My mobile is oh seven seven one, four eight six, three nine two.' },
      { s: 'R', text: 'And how did you hear about the course? Did someone recommend it?' },
      { s: 'C', text: 'My sister mentioned it, actually, but I only decided after I saw the poster in the library.' },
      { s: 'R', text: "Good to know. Now, the course normally lasts eight weeks, but this term it's been extended to ten weeks." },
      { s: 'C', text: 'Ten weeks. And how much is it?' },
      { s: 'R', text: "The full fee is 15,000 rupees, but if you register before the end of the month you get a discount, so it's 12,500.", say: "The full fee is fifteen thousand rupees, but if you register before the end of the month you get a discount, so it's twelve thousand five hundred." },
      { s: 'C', text: 'Do I need to bring my own camera?' },
      { s: 'R', text: "No, we lend cameras to beginners. What you do need is your own memory card, so the photos stay with you. A tripod is useful later, but it isn't necessary." },
      { s: 'C', text: 'OK. And where are the classes held?' },
      { s: 'R', text: "Usually in Room 4, upstairs. But the first session is in the main hall, because there's an introduction talk for all the new courses." },
      { s: 'C', text: 'Is there parking at the centre?' },
      { s: 'R', text: "Our car park is closed for repairs at the moment, and street parking is very limited, so I'd suggest taking the bus. The number 138 stops right outside." },
      { s: 'C', text: "That's easy. Thanks very much for your help." }
    ],
    groups: [
      { type: 'FORM', label: 'Questions 1-6', instruction: 'Complete the form. Write ONE WORD AND/OR A NUMBER for each answer.' },
      { type: 'MCQ', label: 'Questions 7-10', instruction: 'Choose the correct letter, A, B or C.' }
    ],
    questions: [
      { n: 1, type: 'FORM', lo: 'L3', prompt: 'Course: ______ for beginners', answer: ['photography'], predict: 'a subject (noun)' },
      { n: 2, type: 'FORM', lo: 'L2', prompt: 'Day: ______ evenings', answer: ['Tuesday', 'Tuesdays'], predict: 'a day of the week', trap: 'Monday was the old day.' },
      { n: 3, type: 'FORM', lo: 'L1', prompt: 'Surname: Daniel ______', answer: ['Fernando'], predict: 'a spelled name - check every letter' },
      { n: 4, type: 'FORM', lo: 'L1', prompt: 'Mobile number: ______', answer: ['0771486392'], numeric: true, predict: 'a 10-digit number' },
      { n: 5, type: 'FORM', lo: 'L2', prompt: 'Length of course: ______ weeks', answer: ['10', 'ten'], predict: 'a number', trap: 'Eight weeks was the normal length.' },
      { n: 6, type: 'FORM', lo: 'L2', prompt: 'Fee if registered this month: Rs ______', answer: ['12500'], numeric: true, predict: 'an amount of money', trap: '15,000 is the full fee.' },
      { n: 7, type: 'MCQ', lo: 'L2', prompt: 'What finally made the caller decide to join?', options: ['his sister', 'a poster in the library', 'the centre website'], answer: 1, trap: 'His sister mentioned it, but the poster made him decide.' },
      { n: 8, type: 'MCQ', lo: 'L1', prompt: 'What must students bring?', options: ['a camera', 'a memory card', 'a tripod'], answer: 1, trap: 'Cameras are lent; a tripod is not necessary.' },
      { n: 9, type: 'MCQ', lo: 'L2', prompt: 'Where will the first class take place?', options: ['Room 4', 'the main hall', 'the library'], answer: 1, trap: 'Room 4 is the usual room, not the first session.' },
      { n: 10, type: 'MCQ', lo: 'L1', prompt: 'How does the receptionist suggest he travels to the centre?', options: ['by car, parking on the street', 'by bus', 'by bicycle'], answer: 1, trap: 'The car park is closed and street parking is limited.' }
    ],
    vocab: ['register', 'discount', 'extended', 'session']
  };

  // ---------------------------------------------------------------- writing
  const CHART_T1 = {
    title: 'Average hours per week spent on online learning, by age group',
    unit: 'hours per week',
    categories: ['16-24', '25-44', '45+'],
    series: [{ name: '2016', values: [4, 2, 0.5] }, { name: '2024', values: [9, 6, 3] }]
  };

  const WRITING = {
    task1_ac: {
      key: 'task1_ac', task: 1, module: 'academic', lo: 'W2', min: 150, minutes: 20,
      title: 'Task 1 (Academic): describe a chart',
      prompt: 'The chart below shows the average number of hours per week that people in three age groups in one country spent on online learning in 2016 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      chart: CHART_T1,
      coverage: [
        { label: 'mentions 2016', terms: ['2016'] },
        { label: 'mentions 2024', terms: ['2024'] },
        { label: 'youngest group (16-24)', terms: ['16-24', '16 to 24', 'youngest', 'young people', 'younger'] },
        { label: 'middle group (25-44)', terms: ['25-44', '25 to 44', 'middle'] },
        { label: 'oldest group (45+)', terms: ['45+', '45 and over', 'over 45', 'oldest', 'older'] },
        { label: 'describes change', terms: ['increase', 'increased', 'rose', 'risen', 'grew', 'growth', 'doubled', 'tripled', 'rise', 'sixfold', 'six times'] },
        { label: 'gives figures', terms: ['hour', 'hours'] }
      ],
      position: /\b(overall|in general|it is clear|it can be seen|generally|the most striking)\b/i,
      positionLabel: 'an overview sentence (e.g. "Overall, ...")',
      scaffold: ['Paraphrase the question in one sentence.', 'Write an overview: the two biggest patterns, no numbers.', 'Body 1: the youngest group, with figures.', 'Body 2: compare the other two groups.']
    },
    task1_gt: {
      key: 'task1_gt', task: 1, module: 'general', lo: 'W2', min: 150, minutes: 20,
      title: 'Task 1 (General Training): letter of complaint',
      prompt: 'You recently bought a mobile phone online, but it arrived damaged. Write a letter to the company. In your letter: describe the problem, explain what you have done so far, and say what you would like the company to do. Write at least 150 words. You do NOT need to write any addresses. Begin your letter: Dear Sir or Madam,',
      coverage: [
        { label: 'names the product', terms: ['phone', 'mobile', 'handset', 'order'] },
        { label: 'describes the damage', terms: ['damaged', 'broken', 'crack', 'cracked', 'scratched', 'not working', 'faulty'] },
        { label: 'what you have done', terms: ['called', 'emailed', 'contacted', 'tried', 'phoned', 'returned', 'complained'] },
        { label: 'what you want', terms: ['refund', 'replace', 'replacement', 'exchange', 'repair', 'money back'] },
        { label: 'opening', terms: ['dear'] },
        { label: 'formal closing', terms: ['faithfully', 'sincerely', 'regards'] }
      ],
      position: /\b(i am writing|i'm writing|i write)\b/i,
      positionLabel: 'a clear purpose sentence ("I am writing to ...")',
      scaffold: ['State your purpose in the first sentence.', 'Paragraph 1: describe the problem.', 'Paragraph 2: what you have done so far.', 'Paragraph 3: what you want and by when.']
    },
    task2: {
      key: 'task2', task: 2, module: 'both', lo: 'W3', min: 250, minutes: 40,
      title: 'Task 2: opinion essay',
      prompt: 'Some people believe that learning a language through mobile apps can be as effective as studying in a classroom with a teacher. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      coverage: [
        { label: 'discusses apps', terms: ['app', 'apps', 'mobile', 'phone', 'smartphone', 'application'] },
        { label: 'discusses classrooms/teachers', terms: ['classroom', 'teacher', 'teachers', 'class', 'lesson', 'lessons'] },
        { label: 'discusses effectiveness', terms: ['effective', 'effectively', 'progress', 'results', 'improve', 'feedback'] },
        { label: 'gives an example', terms: ['for example', 'for instance', 'such as', 'my friend', 'in my country', 'when i'] }
      ],
      position: /\b(i (strongly |completely |partly |partially )?(agree|disagree|believe|think|would argue|feel)|in my (opinion|view)|my view|from my perspective|i do not believe|i don't believe)\b/i,
      positionLabel: 'a clear position (e.g. "I partly agree because ...")',
      scaffold: ['Introduction: paraphrase + your position.', 'Body 1: strongest reason for your view + example.', 'Body 2: second reason or the other side + why you still hold your view.', 'Conclusion: restate your position in new words.']
    }
  };

  // Pre-scripted sample responses (weak / average / strong). The "teacherBand" is the
  // group's reference rating used in the calibration table; replace with a trained
  // teacher's rating during the real calibration study (Part 6 of the report).
  const WRITING_SAMPLES = {
    task2: [
      { level: 'weak', teacherBand: 4.5, text:
`Nowadays many people use mobile phone for learn language. I think apps is good but classroom is more better.

Firstly apps is cheap and people can learn every where. For example my friend use app every day. But apps can not correct speaking and writing. Teacher can explain grammar and give advices. Also in classroom student can talk with other student and practise. Some people is lazy when they use app alone because nobody check them. In my country many students go to tution class for english because they need teacher.

In conclusion i disagree that app is as effective as classroom because teacher is important for learning language and student need help. Apps can be use with class but not instead of class.` },
      { level: 'average', teacherBand: 6.5, text:
`In recent years, language learning apps have become very popular and some people think they can replace classroom lessons. Although apps have some advantages, I believe that they are not as effective as studying with a teacher.

On the one hand, mobile apps are convenient and cheap. Learners can practise vocabulary at any time, for example when they are travelling to work on the bus. Many apps also use games and daily reminders, which keep users motivated. For people who live far from a language school, an app may be the only way to study regulary.

On the other hand, apps have important limitations. Firstly, they are good for teaching words and simple grammar, but they can not give detailed feedback on speaking or writing. A teacher can notice that a student is repeating the same mistake and explain why it is wrong. A teacher can also give students a clear plan and check their homework every week, which many learners need. Secondly, a classroom gives learners the chance to communicate with real people. When students discuss a topic in a group, they have to answer quickly and use the language in a natural way. This is difficult to do with a phone. In addition, many learners find it hard to study alone, so they stop using the app after few weeks.

In conclusion, I think mobile apps are a useful tool for extra practice, especially for busy people, but they are not as effective as a classroom with a teacher. The best way is probably to combine both methods.` },
      { level: 'strong', teacherBand: 8.0, text:
`Smartphone applications have transformed the way millions of people approach a new language, and their supporters argue that a well-designed app can now rival a traditional classroom. While I accept that apps offer remarkable flexibility, I would argue that, for most learners, they remain a complement to teacher-led instruction rather than an equivalent.

Admittedly, the strengths of mobile learning are considerable. Because lessons are broken into short, manageable units, learners can study in spare moments, such as during a commute or a lunch break, which suits people with demanding jobs. Moreover, features such as spaced repetition help users retain vocabulary far more efficiently than occasional cramming, and immediate correction on simple exercises prevents errors from becoming habits. For learners in rural areas, where qualified teachers may be scarce, these advantages are particularly significant.

Nevertheless, language is ultimately a social skill, and this is where apps fall short. Productive skills such as extended writing and spontaneous speaking require feedback that responds to meaning, not merely to form. An experienced teacher can recognise why a student's argument is unconvincing or why their pronunciation obscures a particular word, and can adapt the explanation accordingly. Furthermore, classroom interaction forces learners to negotiate meaning in real time, an experience that scripted dialogues on a screen rarely reproduce. Motivation is another concern: without the accountability that a class provides, many independent learners abandon their studies once the initial novelty fades.

In conclusion, although mobile apps are an excellent means of building vocabulary and maintaining daily practice, I do not believe they are as effective as classroom learning for developing genuine communicative competence. Learners are likely to achieve the best results by using apps to reinforce, rather than replace, the guidance of a skilled teacher.` }
    ],
    task1_ac: [
      { level: 'weak', teacherBand: 4.5, text:
`The chart is about hours of online learning. In 2016 young people study 4 hours and in 2024 they study 9 hours. People 25 to 44 study 2 hours in 2016 and 6 hours in 2024. Old people study very little in 2016, only 0.5 hour, but in 2024 is 3 hours. So all group is increase. Young people study the most. I think online learning is good because it is easy and cheap for everybody.` },
      { level: 'average', teacherBand: 6.0, text:
`The bar chart shows how many hours per week people in three different age groups spent on online learning in 2016 and 2024.

Overall, all three groups spent more time learning online in 2024 than in 2016, and the youngest group spent the most time in both years.

In 2016, people aged 16 to 24 studied online for about 4 hours a week, which was double the figure for the 25-44 group, at 2 hours. People aged 45 and over spent only half an hour per week. By 2024, the time for the youngest group had increased to 9 hours.

The middle group also increased a lot, from 2 hours to 6 hours, so it tripled. The oldest group had the biggest change in proportion, because it rose from 0.5 hours to 3 hours, which is six times more. However, they still studied less than the other two groups in 2024.` },
      { level: 'strong', teacherBand: 7.5, text:
`The bar chart compares the average weekly time that three age groups in one country devoted to online learning in 2016 and 2024.

Overall, online study increased considerably across every age group over the period, and although the youngest learners consistently spent the most time studying online, the most dramatic proportional growth occurred among those aged 45 and over.

In 2016, people aged 16 to 24 spent approximately 4 hours a week on online courses, twice as long as the 25-44 group, whose figure stood at 2 hours. The oldest group, by contrast, studied online for only around half an hour per week, which suggests that digital learning was still uncommon among older adults at that time.

By 2024, the figure for the youngest group had more than doubled to 9 hours, while the middle group had tripled its weekly study time to 6 hours. Most strikingly, those aged 45 and over increased their online learning sixfold, reaching 3 hours a week. Nevertheless, this group still spent considerably less time studying online than either of the younger age groups.` }
    ]
  };

  // ---------------------------------------------------------------- speaking
  const SPEAKING = {
    parts: [
      { part: 1, lo: 'S1', title: 'Part 1: Introduction and interview', seconds: 30, coverage: [],
        questions: [
          "Let's talk about where you live. Do you live in a house or an apartment?",
          'What do you like most about the area where you live?',
          'How often do you use your mobile phone for studying? Why?'
        ] },
      { part: 2, lo: 'S2', title: 'Part 2: Long turn', seconds: 120, prep: 60,
        cue: {
          topic: 'Describe a skill that took you a long time to learn.',
          points: ['what the skill is', 'when you started learning it', 'how you learned it'],
          explain: 'and explain why it took you a long time to learn.'
        },
        coverage: [
          { label: 'names the skill', terms: ['skill', 'learn', 'learned', 'learnt', 'learning'] },
          { label: 'when you started', terms: ['when i was', 'years old', 'ago', 'started', 'age of', 'grade'] },
          { label: 'how you learned', terms: ['teacher', 'practise', 'practice', 'practised', 'lessons', 'taught', 'videos', 'class'] },
          { label: 'why it took long', terms: ['because', 'difficult', 'hard', 'reason', 'scared', 'afraid', 'time'] }
        ] },
      { part: 3, lo: 'S3', title: 'Part 3: Discussion', seconds: 60, coverage: [],
        questions: [
          'Why do you think some people give up when they are learning a new skill?',
          'Does technology make it easier or harder to learn practical skills? Why?'
        ] }
    ],
    // Pre-scripted Part 2 transcripts. "(pause)" and "..." mark pauses. seconds = speaking time.
    samples: [
      { level: 'weak', teacherBand: 4.0, seconds: 95, text:
`Um... I want to talk about... swimming. Er, I start learn swimming when I am ten years. My father, um, he take me to the... the pool near my house. It was very difficult because, er, I am scared of water. (pause) I don't like put my face in water. Um, so I learn slowly, like, every Sunday. Er... my teacher is good, he help me. After two year I can swim. Um... it take long time because I am scared and, er, I don't practise much. Now I like swimming. (pause) Yes. That's all.` },
      { level: 'average', teacherBand: 6.5, seconds: 95, text:
`I'd like to talk about driving a car, which took me quite a long time to learn. I started learning about three years ago, when I finished my A levels. At first my uncle taught me on the weekends, because he has a small car and he is very patient. Um, after that I joined a driving school near my town and I had lessons twice a week. The main reason it took a long time was that I was very nervous on busy roads. In Colombo the traffic is really heavy, and the buses don't always stop where you expect. Er, I failed my first test because I made a mistake when I was parking. So I practised parking again and again in an empty car park. Finally I passed on my second try, and I was really happy. Now I drive to work most days, so I think it was worth the effort.` },
      { level: 'strong', teacherBand: 7.5, seconds: 105, text:
`I'd like to talk about playing the violin, which is probably the skill that has taken me the longest to develop. I actually started when I was about eight, because my grandmother had played in an orchestra and she was keen for one of her grandchildren to carry on the tradition. For the first few years I had weekly lessons with a private teacher, and to be honest, I found it incredibly frustrating, since the violin is one of those instruments where even producing a pleasant sound takes months of practice. What made it particularly slow was that there are no frets, so you have to train your ear to hear whether a note is slightly out of tune, and that kind of sensitivity only comes with time. On top of that, I had school exams, so there were long periods when I barely practised at all. Things only really changed when I joined a youth orchestra in my teens, because playing alongside other people gave me a reason to practise consistently. Looking back, I think it took so long partly because of the instrument itself, but mainly because I didn't have a clear goal until then.` }
    ]
  };

  // ---------------------------------------------------------------- diagnostic
  const DIAGNOSTIC = {
    reading: {
      lo: 'R2',
      text: 'Many cities are now planting trees along busy roads. Supporters say that trees reduce summer temperatures, because their leaves provide shade and release water into the air. A study in one large city found that streets with many trees were up to four degrees cooler on hot afternoons than streets without them. However, trees also create problems. Their roots can damage pavements, and falling branches can block roads during storms. For this reason, city planners now choose species carefully, preferring trees with deep roots and strong wood. Some cities also ask residents to help care for young trees during their first two years, when they need the most water.',
      questions: [
        { n: 1, type: 'TFNG', prompt: 'Trees can lower temperatures on city streets.', answer: 'TRUE' },
        { n: 2, type: 'TFNG', prompt: 'Most residents of the city want more trees to be planted.', answer: 'NOT GIVEN' },
        { n: 3, type: 'MCQ', prompt: 'Why do city planners choose tree species carefully?', options: ['to save money on planting', 'to reduce damage and storm problems', 'to make the trees grow faster'], answer: 1 },
        { n: 4, type: 'MCQ', prompt: 'When do young trees need the most water?', options: ['in their first two years', 'during winter', 'after storms'], answer: 0 }
      ]
    },
    listening: {
      lo: 'L1',
      script: [
        { s: 'R', text: 'Good afternoon, passengers. The 4.15 train to Kandy will leave from platform three, not platform one as shown on the screen.', say: 'Good afternoon, passengers. The four fifteen train to Kandy will leave from platform three, not platform one as shown on the screen.' },
        { s: 'R', text: 'Because of work on the line, the journey will take about three and a half hours today.' },
        { s: 'R', text: 'Refreshments are available in carriage C. Passengers travelling with bicycles should speak to the guard before boarding. Thank you.' }
      ],
      questions: [
        { n: 1, type: 'FORM', prompt: 'Platform number: ______', answer: ['3', 'three'] },
        { n: 2, type: 'FORM', prompt: 'Journey time today: about ______ hours', answer: ['3.5', 'three and a half', '3 and a half', '3 1/2'] },
        { n: 3, type: 'FORM', prompt: 'Refreshments: carriage ______', answer: ['c'] },
        { n: 4, type: 'FORM', prompt: 'Passengers with bicycles: speak to the ______', answer: ['guard'] }
      ]
    },
    writing: { min: 50, prompt: 'In about 60-100 words, describe how you are preparing for IELTS now and what you find most difficult.' },
    speaking: { prompt: 'Imagine the examiner asks: "What do you usually do at the weekend?" Type what you would say (2-4 sentences).' }
  };

  // ---------------------------------------------------------------- vocab deck
  const VOCAB = [
    { w: 'restoration', d: 'the act of bringing something back to a former condition', ex: 'Mangrove restoration takes years.' },
    { w: 'livelihood', d: 'the way a person earns money to live', ex: 'Fishing is the main livelihood in the village.' },
    { w: 'infrastructure', d: 'basic systems a society needs, such as roads and power', ex: 'Mangroves act as natural infrastructure.' },
    { w: 'considerably', d: 'by a large amount', ex: 'Online study increased considerably.' },
    { w: 'complement', d: 'something that improves another thing when used with it', ex: 'Apps are a complement to classes.' },
    { w: 'accountability', d: 'being responsible for your actions to someone else', ex: 'A class gives learners accountability.' },
    { w: 'sixfold', d: 'six times as much or as many', ex: 'Their study time rose sixfold.' },
    { w: 'scarce', d: 'not enough; hard to find', ex: 'Qualified teachers are scarce in rural areas.' }
  ];

  // ---------------------------------------------------------------- translations
  // Short instruction lines in Sinhala and Tamil. MUST be checked by a native speaker
  // before release (listed as an action in the report).
  const I18N = {
    reading: { si: 'චේදය කියවා ප්‍රශ්නවලට පිළිතුරු දෙන්න.', ta: 'பகுதியைப் படித்து கேள்விகளுக்குப் பதிலளிக்கவும்.' },
    listening: { si: 'සවන් දී ප්‍රශ්නවලට පිළිතුරු දෙන්න.', ta: 'கேட்டு கேள்விகளுக்குப் பதிலளிக்கவும்.' },
    writing: { si: 'ප්‍රශ්නයට අනුව ඔබේ පිළිතුර ලියන්න.', ta: 'கேள்விக்கு ஏற்ப உங்கள் பதிலை எழுதவும்.' },
    speaking: { si: 'ප්‍රශ්නයට පිළිතුරු දෙන්න. ඔබට ටයිප් කළ හැක.', ta: 'கேள்விக்குப் பதிலளிக்கவும். தட்டச்சு செய்யலாம்.' }
  };

  const Content = { OBJECTIVES, READING, LISTENING, WRITING, WRITING_SAMPLES, SPEAKING, DIAGNOSTIC, VOCAB, I18N, CHART_T1 };
  root.Content = Content;
  if (typeof module !== 'undefined' && module.exports) module.exports = Content;
})(typeof window !== 'undefined' ? window : globalThis);
