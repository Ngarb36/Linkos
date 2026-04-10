const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const TYPE_EMOJI = {
  video: '🎬',
  article: '📰',
  tutorial: '📚',
  documentation: '📖',
  tool: '🛠️',
  other: '🔗',
};

async function saveLink({ url, type, title, summary, tags, senderName }) {
  const emoji = TYPE_EMOJI[type] || '🔗';
  const pageTitle = title || url;

  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    icon: { type: 'emoji', emoji },
    properties: {
      // "Name" is the default title property in Notion
      Name: {
        title: [{ text: { content: pageTitle } }],
      },
      URL: {
        url: url,
      },
      Type: {
        select: { name: capitalize(type) },
      },
      Summary: {
        rich_text: summary ? [{ text: { content: summary } }] : [],
      },
      Source: {
        select: { name: extractDomain(url) },
      },
      Status: {
        status: { name: 'To Read' },
      },
      ...(tags && tags.length > 0 && {
        Tags: {
          multi_select: tags.map((t) => ({ name: t })),
        },
      }),
      'Added At': {
        date: { start: new Date().toISOString() },
      },
    },
  });
}

async function verifyDatabase() {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  return db.title[0]?.plain_text || 'Linkos';
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { saveLink, verifyDatabase };
