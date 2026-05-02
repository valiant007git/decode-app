const express = require('express');
const router = express.Router();

const SCANNED_ERROR = {
  success: false,
  error: "This PDF appears to be a scanned image — our reader can only process text-based PDFs. Please copy the text from your PDF and paste it in the text box instead.",
  isScanned: true,
};

router.post('/', async (req, res) => {
  try {
    const pdfParse = require('pdf-parse');
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'No PDF provided.' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');

    let data;
    try {
      data = await pdfParse(buffer);
    } catch (parseErr) {
      const msg = parseErr.message || '';
      if (msg.includes('encrypt') || msg.includes('password')) {
        return res.status(400).json({
          success: false,
          error: 'This PDF is password-protected. Please remove the password and try again.',
          isEncrypted: true,
        });
      }
      return res.status(400).json(SCANNED_ERROR);
    }

    const text = (data.text || '').slice(0, 4000).trim();

    if (!text) {
      return res.status(400).json(SCANNED_ERROR);
    }

    res.json({ success: true, text });
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json(SCANNED_ERROR);
  }
});

module.exports = router;
