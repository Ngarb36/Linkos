const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Known video/article domains for quick classification without AI
const VIDEO_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'twitch.tv', 'dailymotion.com', 'loom.com'];
const DOC_DOMAINS = ['docs.google.com', 'developer.mozilla.org', 'docs.python.org', 'docs.aws.amazon.com', 'docs.microsoft.com'];

const VALID_TYPES = ['video', 'article', 'tutorial', 'documentation', 'tool', 'other'];

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function quickClassify(url) {
  const domain = extractDomain(url);
  if (VIDEO_DOMAINS.some((d) => domain.includes(d))) return 'video';
  if (DOC_DOMAINS.some((d) => domain.includes(d))) return 'documentation';
  return null;
}

async function classifyLink(url, userNote = '') {
  // Fast path for known domains
  const quick = quickClassify(url);
  if (quick) {
    return { type: quick, title: null, summary: null };
  }

  const prompt = `Classify the following URL and extract info about it.

URL: ${url}
${userNote ? `User note: ${userNote}` : ''}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "type": "<one of: video, article, tutorial, documentation, tool, other>",
  "title": "<short descriptive title, max 80 chars>",
  "summary": "<one sentence describing the content, max 120 chars>"
}

Classification guide:
- video: any video content (YouTube, Vimeo, talks, courses with video)
- tutorial: step-by-step how-to guides, coding walkthroughs, workshops
- article: blog posts, news, opinion pieces, essays
- documentation: official docs, API references, changelogs
- tool: online tools, apps, libraries, frameworks, GitHub repos
- other: anything that doesn't fit above`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: 'You are a link classifier. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text);
    if (!VALID_TYPES.includes(parsed.type)) parsed.type = 'other';
    return parsed;
  } catch {
    return { type: 'other', title: null, summary: null };
  }
}

module.exports = { classifyLink };
