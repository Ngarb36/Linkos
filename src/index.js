require('dotenv').config();

const { createWhatsAppClient } = require('./whatsapp');
const { classifyLink } = require('./classifier');
const { saveLink, verifyDatabase } = require('./notion');
const { startQRServer } = require('./qrServer');

// Validate required env vars
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'NOTION_TOKEN', 'NOTION_DATABASE_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

// Optional: restrict to specific phone numbers
const ALLOWED_NUMBERS = process.env.ALLOWED_NUMBERS
  ? process.env.ALLOWED_NUMBERS.split(',').map((n) => n.trim())
  : [];

// URL regex — matches http/https URLs
const URL_REGEX = /https?:\/\/[^\s]+/gi;

function extractUrls(text) {
  return (text.match(URL_REGEX) || []).map((url) => url.replace(/[.,!?)]+$/, ''));
}

function isAllowed(sender) {
  if (ALLOWED_NUMBERS.length === 0) return true;
  const number = sender.replace('@c.us', '');
  return ALLOWED_NUMBERS.includes(number);
}

async function handleMessage(message) {
  // Skip bot's own replies to avoid loops
  if (message.body && message.body.includes('saved to Notion')) return;
  // For incoming messages from others, check allowed list
  if (!message.fromMe && !isAllowed(message.from)) return;

  const text = message.body || '';
  const urls = extractUrls(text);
  if (urls.length === 0) return;

  // Extract optional user note (text without URLs)
  const userNote = text.replace(URL_REGEX, '').trim();

  // Get sender display name
  const contact = await message.getContact();
  const senderName = contact.pushname || contact.name || message.from.replace('@c.us', '');

  for (const url of urls) {
    try {
      await message.react('⏳');

      const { type, title, summary } = await classifyLink(url, userNote);
      await saveLink({ url, type, title, summary, senderName });

      const emoji = { video: '🎬', article: '📰', tutorial: '📚', documentation: '📖', tool: '🛠️', other: '🔗' }[type] || '🔗';
      await message.react('✅');
      await message.reply(`${emoji} *${capitalize(type)}* saved to Notion!\n${title ? `_${title}_` : ''}`);
    } catch (err) {
      console.error('Error processing link:', url, err);
      await message.react('❌');
      await message.reply('Failed to save this link. Check the bot logs.');
    }
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function main() {
  console.log('🔗 Linkos – WhatsApp → Notion link saver');
  console.log('─'.repeat(40));

  startQRServer();

  // Verify Notion connection before starting WhatsApp
  try {
    const dbName = await verifyDatabase();
    console.log(`✅ Connected to Notion database: "${dbName}"`);
  } catch (err) {
    console.error('❌ Could not connect to Notion:', err.message);
    console.error('Check your NOTION_TOKEN and NOTION_DATABASE_ID in .env');
    process.exit(1);
  }

  const client = createWhatsAppClient();
  client.on('message_create', handleMessage);
  await client.initialize();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
