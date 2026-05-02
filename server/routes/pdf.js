const express = require('express');
const router = express.Router();
const pdfParse = require('pdf-parse');

router.post('/', async (req, res) => {
  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'No PDF provided.' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdfParse(buffer);
    const extractedText = data.text.slice(0, 3000);

    if (!extractedText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Could not read PDF. Please try copying the text manually.',
      });
    }

    res.json({ success: true, text: extractedText });
  } catch (err) {
    console.error('PDF parse error:', err);
    res.status(500).json({
      success: false,
      error: 'Could not read this PDF. Please copy the text and paste it instead.',
    });
  }
});

module.exports = router;
