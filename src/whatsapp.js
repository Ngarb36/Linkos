const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { setQR, setReady } = require('./qrServer');

function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n📱 QR ready — open the Railway URL to scan\n');
    qrcode.generate(qr, { small: true });
    setQR(qr);
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
  });

  client.on('ready', () => {
    console.log('🚀 Linkos bot is ready!');
    setReady();
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
  });

  client.on('disconnected', (reason) => {
    console.warn('⚠️  WhatsApp disconnected:', reason);
  });

  return client;
}

module.exports = { createWhatsAppClient };
