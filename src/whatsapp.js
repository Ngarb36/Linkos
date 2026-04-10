const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
  });

  client.on('ready', () => {
    console.log('🚀 Linkos bot is ready!');
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
