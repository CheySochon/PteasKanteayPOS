const qrcode = require('qrcode');

function makeTableToken(name) {
  return `table-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

function makeQrDataUrl(value) {
  return qrcode.toDataURL(value);
}

function makeQrPngBuffer(value) {
  return qrcode.toBuffer(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
}

module.exports = { makeTableToken, makeQrDataUrl, makeQrPngBuffer };
