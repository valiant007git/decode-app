const express = require('express');
const Groq = require('groq-sdk');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Decode — a calm, warm AI that helps everyday people in India understand confusing documents. You MUST respond with ONLY valid JSON, no markdown, no extra text. The JSON keys must ALWAYS be in English exactly as shown — never translate them. Only the values should be in the user's chosen language. Format: { "what_is_this": "2-3 sentences on what kind of document this is", "what_it_means_for_you": "the single most important thing the user needs to know in plain simple language", "what_to_do_next": ["action step 1", "action step 2", "action step 3"] }. Use simple, everyday words. Avoid jargon. Be warm and reassuring.`;

router.post('/', async (req, res) => {
  try {
    const { text, imageBase64, language, docType } = req.body;

    const usageCount = parseInt(req.headers['x-usage-count'] || '0', 10);
    const isPaid = req.headers['x-is-paid'] === 'true';

    if (usageCount >= 3 && !isPaid) {
      return res.status(402).json({ error: 'LIMIT_REACHED' });
    }

    let userMessage;

    if (imageBase64) {
      userMessage = `The user has uploaded an image of a document. Document type is ${docType}. Based on the document type and any text provided, give the best explanation possible. Explain in ${language}.${text ? `\n\nAdditional text from document:\n${text}` : ''}`;
    } else {
      userMessage = `Document type: ${docType}. Explain in ${language}.\n\nContent:\n${text}`;
    }

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
    });

    const rawText = response.choices[0].message.content;
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

const FOLLOWUP_PROMPT = `You are Decode assistant. The user has already decoded a document and has a follow-up question. Answer in simple plain language in their chosen language. Be warm, clear and concise. Max 3 sentences.`;

router.post('/followup', async (req, res) => {
  try {
    const { question, originalText, language } = req.body;
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: FOLLOWUP_PROMPT },
        { role: 'user', content: `Document content: ${originalText}\n\nQuestion: ${question}` },
      ],
      max_tokens: 512,
    });
    return res.json({ success: true, answer: response.choices[0].message.content });
  } catch (err) {
    console.error('Followup error:', err);
    return res.status(500).json({ success: false, error: 'Could not answer. Please try again.' });
  }
});

module.exports = router;
