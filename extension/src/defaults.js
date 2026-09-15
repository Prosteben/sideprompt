/* Starter prompts seeded on first install (classic script, global PV_DEFAULT_PROMPTS) */
const PV_DEFAULT_PROMPTS = [
  {
    title: 'Improve my writing',
    folder: 'Writing',
    tags: ['edit', 'clarity'],
    pinned: true,
    body: 'Act as a professional editor. Improve the clarity, flow and grammar of the text below while keeping my voice and meaning. Tone: {{tone|professional}}. Return only the revised text, then a short bullet list of the main changes.\n\nText:\n{{text}}',
  },
  {
    title: 'Summarize in 5 bullets',
    folder: 'Writing',
    tags: ['summary'],
    body: 'Summarize the following content in exactly 5 concise bullet points, ordered by importance. Add one sentence at the end with the single most important takeaway.\n\n{{content}}',
  },
  {
    title: 'Reply to this email',
    folder: 'Writing',
    tags: ['email'],
    body: 'Write a {{tone|friendly but professional}} reply to the email below. Keep it under 120 words, address every question asked, and end with a clear next step.\n\nEmail:\n{{email}}',
  },
  {
    title: 'Explain code',
    folder: 'Coding',
    tags: ['explain'],
    body: 'Explain what this code does step by step, as if to a mid-level developer. Point out any bugs, edge cases or performance issues you notice, then suggest concrete improvements.\n\n```\n{{code}}\n```',
  },
  {
    title: 'Code review',
    folder: 'Coding',
    tags: ['review', 'quality'],
    pinned: true,
    body: 'Review the following {{language|code}} as a senior engineer. Focus on: correctness, security, readability, and performance. For each issue give severity (high/medium/low), the line or snippet, and a fixed version.\n\n```\n{{code}}\n```',
  },
  {
    title: 'Write unit tests',
    folder: 'Coding',
    tags: ['tests'],
    body: 'Write thorough unit tests for the code below using {{framework|the most common test framework for this language}}. Cover happy paths, edge cases and failure modes. Use descriptive test names.\n\n```\n{{code}}\n```',
  },
  {
    title: 'Fix this error',
    folder: 'Coding',
    tags: ['debug'],
    body: 'I get the following error. Explain the most likely root cause, then give the minimal fix and how to verify it.\n\nError:\n{{error}}\n\nRelevant code:\n{{code}}',
  },
  {
    title: 'Landing page copy',
    folder: 'Marketing',
    tags: ['copywriting'],
    body: 'Write landing page copy for {{product}} aimed at {{audience}}. Include: a headline (max 8 words), a subheadline, 3 benefit blocks (title + 1 sentence), social proof placeholder, and a call to action. Tone: {{tone|clear and confident}}.',
  },
  {
    title: 'SEO blog outline',
    folder: 'Marketing',
    tags: ['seo', 'blog'],
    body: 'Create a detailed blog post outline targeting the keyword "{{keyword}}". Include an SEO title (under 60 chars), meta description (under 155 chars), H2/H3 structure, suggested word count per section, and 5 related long-tail keywords.',
  },
  {
    title: 'Explain like I am 12',
    folder: 'Learning',
    tags: ['eli5'],
    body: 'Explain {{topic}} to a curious 12-year-old. Use one everyday analogy, avoid jargon, and finish with 3 quick questions I can use to check my understanding.',
  },
  {
    title: 'Study plan',
    folder: 'Learning',
    tags: ['plan'],
    body: 'Create a {{weeks|4}}-week study plan to learn {{topic}}. I can spend {{hours|5}} hours per week. For each week list goals, resources (free where possible), practice exercises and a self-check.',
  },
  {
    title: 'Meeting notes to action items',
    folder: 'Writing',
    tags: ['meeting'],
    body: 'Turn these meeting notes into: 1) a 3-sentence summary, 2) decisions made, 3) action items as a table with owner and due date, 4) open questions.\n\nNotes:\n{{notes}}',
  },
];
