require('dotenv').config();

const { Telegraf } = require('telegraf');
const { classifyLink } = require('./classifier');
const { saveLink, verifyDatabase } = require('./notion');

const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'NOTION_TOKEN', 'NOTION_DATABASE_ID', 'TELEGRAM_BOT_TOKEN'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const URL_REGEX = /https?:\/\/[^\s]+/gi;

const TYPE_EMOJI = {
  video: '🎬',
  article: '📰',
  tutorial: '📚',
  documentation: '📖',
  tool: '🛠️',
  other: '🔗',
};

function extractUrls(text) {
  return (text.match(URL_REGEX) || []).map((url) => url.replace(/[.,!?)]+$/, ''));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatReply({ url, type, title, summary, source, tags }) {
  const emoji = TYPE_EMOJI[type] || '🔗';
  const lines = [
    `${emoji} *${capitalize(type)}* — נשמר ב-Notion!`,
    '',
    title   ? `📌 *כותרת:* ${title}` : null,
    summary ? `📝 *סיכום:* ${summary}` : null,
    `🌐 *מקור:* ${source}`,
    tags && tags.length > 0 ? `🏷 *תגיות:* ${tags.join(' · ')}` : null,
    `🔗 ${url}`,
  ];
  return lines.filter(Boolean).join('\n');
}

async function handleMessage(ctx) {
  const text = ctx.message?.text || ctx.message?.caption || '';
  const urls = extractUrls(text);
  if (urls.length === 0) return;

  const senderName =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  for (const url of urls) {
    const thinking = await ctx.reply('⏳ מסווג ושומר...');

    try {
      const userNote = text.replace(URL_REGEX, '').trim();
      const { type, title, summary, tags } = await classifyLink(url, userNote);

      const source = (() => {
        try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
      })();

      await saveLink({ url, type, title, summary, tags, senderName });

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        undefined,
        formatReply({ url, type, title, summary, source, tags }),
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Error:', err);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        thinking.message_id,
        undefined,
        '❌ משהו השתבש. נסה שוב.'
      );
    }
  }
}

async function main() {
  console.log('🔗 Linkos – Telegram → Notion link saver');
  console.log('─'.repeat(40));

  try {
    const dbName = await verifyDatabase();
    console.log(`✅ Connected to Notion database: "${dbName}"`);
  } catch (err) {
    console.error('❌ Could not connect to Notion:', err.message);
    process.exit(1);
  }

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.on('message', handleMessage);

  bot.launch();
  console.log('🚀 Linkos bot is running on Telegram!');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
