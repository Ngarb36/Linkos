const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = null;
let isReady = false;

app.get('/', (req, res) => {
  if (isReady) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
        <h2>✅ WhatsApp Connected!</h2>
        <p>Linkos bot is running. You can close this page.</p>
      </body></html>
    `);
  }
  if (!currentQR) {
    return res.send(`
      <html><head><meta http-equiv="refresh" content="3"></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
        <h2>⏳ Waiting for QR code...</h2>
        <p>This page refreshes automatically.</p>
      </body></html>
    `);
  }
  res.send(`
    <html><head><meta http-equiv="refresh" content="30"></head>
    <body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
      <h2>📱 Scan with WhatsApp</h2>
      <p>WhatsApp → Linked Devices → Link a Device</p>
      <img src="/qr.png" style="max-width:300px;border:8px solid white;border-radius:12px">
      <p style="color:#888;font-size:12px">QR expires in ~20 seconds — page refreshes automatically</p>
    </body></html>
  `);
});

app.get('/qr.png', async (req, res) => {
  if (!currentQR) return res.status(404).send('No QR yet');
  const QRCode = require('qrcode');
  const png = await QRCode.toBuffer(currentQR, { width: 400, margin: 2 });
  res.set('Content-Type', 'image/png');
  res.send(png);
});

function startQRServer() {
  app.listen(PORT, () => {
    console.log(`🌐 QR server running on port ${PORT}`);
  });
}

function setQR(qr) {
  currentQR = qr;
}

function setReady() {
  isReady = true;
  currentQR = null;
}

module.exports = { startQRServer, setQR, setReady };
