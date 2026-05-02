const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Decode — a calm, warm AI that helps everyday people in India understand confusing documents. You MUST respond with ONLY valid JSON, no markdown, no extra text. Format: { "what_is_this": "2-3 sentences on what kind of document this is", "what_it_means_for_you": "the single most important thing the user needs to know in plain simple language", "what_to_do_next": ["action step 1", "action step 2", "action step 3"] }. Respond in the user's chosen language. Use simple, everyday words. Avoid jargon. Be warm and reassuring.`;

router.post('/', async (req, res) => {
  try {
    const { text, imageBase64, language, docType } = req.body;

    const usageCount = parseInt(req.headers['x-usage-count'] || '0', 10);
    const isPaid = req.headers['x-is-paid'] === 'true';

    if (usageCount >= 3 && !isPaid) {
      return res.status(402).json({ error: 'LIMIT_REACHED' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    let parts;

    if (imageBase64) {
      parts = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: `Document type: ${docType}. Explain in ${language}.`,
        },
      ];
    } else {
      parts = [
        {
          text: `Document type: ${docType}. Explain in ${language}.\n\nContent:\n${text}`,
        },
      ];
    }

    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    const parsed = JSON.parse(rawText);

    return res.json({
      success: true,
      result: {
        what_is_this: parsed.what_is_this,
        what_it_means_for_you: parsed.what_it_means_for_you,
        what_to_do_next: parsed.what_to_do_next,
      },
    });
  } catch (err) {
    console.error('Decode error:', err);
    return res.status(500).json({ success: false, error: 'Failed to decode. Please try again.' });
  }
});

module.exports = router;
