const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VIDEO_DOMAINS = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'twitch.tv', 'dailymotion.com', 'loom.com'];
const DOC_DOMAINS = ['developer.mozilla.org', 'docs.python.org', 'docs.aws.amazon.com', 'docs.microsoft.com'];
const VALID_TYPES = ['video', 'article', 'tutorial', 'documentation', 'tool', 'other'];

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

// Fetch og:title, og:description, og:type from the page
async function fetchMetadata(url) {
  try {
    const res = await axios.get(url, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Linkos/1.0; +https://github.com)' },
      maxRedirects: 5,
      maxContentLength: 400000,
      responseType: 'text',
    });
    const html = res.data || '';
    const get = (patterns) => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      }
      return null;
    };
    return {
      ogTitle:       get([/property="og:title"\s+content="([^"]+)"/i, /content="([^"]+)"\s+property="og:title"/i]),
      ogDescription: get([/property="og:description"\s+content="([^"]+)"/i, /content="([^"]+)"\s+property="og:description"/i]),
      ogType:        get([/property="og:type"\s+content="([^"]+)"/i, /content="([^"]+)"\s+property="og:type"/i]),
      pageTitle:     get([/<title[^>]*>([^<]+)<\/title>/i]),
    };
  } catch {
    return {};
  }
}

async function classifyLink(url, userNote = '') {
  const [meta] = await Promise.all([fetchMetadata(url)]);
  const domain = extractDomain(url);

  // Fast-path: og:type starts with "video" (catches Facebook videos, etc.)
  const isVideoByMeta = meta.ogType && meta.ogType.toLowerCase().startsWith('video');
  const isVideoByDomain = VIDEO_DOMAINS.some((d) => domain.includes(d));
  const isDoc = DOC_DOMAINS.some((d) => domain.includes(d));

  if (isVideoByMeta || isVideoByDomain) {
    return {
      type: 'video',
      title: meta.ogTitle || meta.pageTitle || null,
      summary: meta.ogDescription || null,
      tags: [],
    };
  }
  if (isDoc) {
    return {
      type: 'documentation',
      title: meta.ogTitle || meta.pageTitle || null,
      summary: meta.ogDescription || null,
      tags: [],
    };
  }

  // Ask Claude with full metadata context
  const context = [
    `URL: ${url}`,
    meta.ogTitle       && `Title: ${meta.ogTitle}`,
    meta.ogDescription && `Description: ${meta.ogDescription}`,
    meta.ogType        && `OG Type: ${meta.ogType}`,
    !meta.ogTitle && meta.pageTitle && `Page Title: ${meta.pageTitle}`,
    userNote           && `User note: ${userNote}`,
  ].filter(Boolean).join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: 'You are a link classifier. Always respond with valid JSON only, no markdown.',
    messages: [{
      role: 'user',
      content: `Classify this link and extract info.

${context}

Return ONLY this JSON:
{
  "type": "<video|article|tutorial|documentation|tool|other>",
  "title": "<clear title based on the actual content, max 80 chars>",
  "summary": "<one sentence about the content, max 120 chars>",
  "tags": ["tag1", "tag2", "tag3"]
}

Classification:
- video: video content of any kind
- tutorial: step-by-step guides, how-to
- article: blog posts, news, essays
- documentation: official docs, API references
- tool: apps, GitHub repos, online tools
- tags: 2-4 short relevant topic tags`,
    }],
  });

  try {
    const parsed = JSON.parse(response.content[0].text.trim());
    if (!VALID_TYPES.includes(parsed.type)) parsed.type = 'other';
    if (!Array.isArray(parsed.tags)) parsed.tags = [];
    parsed.title = parsed.title || meta.ogTitle || meta.pageTitle || null;
    parsed.summary = parsed.summary || meta.ogDescription || null;
    return parsed;
  } catch {
    return {
      type: 'other',
      title: meta.ogTitle || meta.pageTitle || null,
      summary: meta.ogDescription || null,
      tags: [],
    };
  }
}

module.exports = { classifyLink };
