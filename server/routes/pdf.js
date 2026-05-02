const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const pdfParse = require('pdf-parse');
    const { pdfBase64 } = req.body;
    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdfParse(buffer);
    const text = data.text.slice(0, 4000).trim();
    if (!text) {
      return res.status(400).json({ success: false, error: 'Could not extract text from this PDF.' });
    }
    res.json({ success: true, text });
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ success: false, error: 'PDF read failed.' });
  }
});

module.exports = router;
