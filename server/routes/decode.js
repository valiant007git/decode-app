const express = require('express');
const Groq = require('groq-sdk');
const { stats } = require('../stats');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Decode — a calm, warm AI that helps everyday people in India understand confusing documents. You MUST respond with ONLY valid JSON, no markdown, no extra text. The JSON keys must ALWAYS be in English exactly as shown — never translate them. Only the values should be in the user's chosen language.

Format: { "what_is_this": "2-3 sentences on what kind of document this is", "what_it_means_for_you": "the single most important thing the user needs to know in plain simple language", "what_to_do_next": ["action step 1", "action step 2", "action step 3"] }

For complex legal documents: identify the 3 most important clauses that affect the user directly.
For complex medical reports: focus on the most abnormal values and what they mean in plain language.
For financial documents: explain what the numbers mean for the person's money in simple terms.
Always prioritize what the user needs to DO, not just what the document says.

Use simple, everyday words. Avoid jargon. Be warm and reassuring.`;

function computeComplexity(docType, textLength) {
  const complexTypes = ['Legal notice', 'Contract'];
  const moderateTypes = ['Medical report', 'Bank document', 'Govt letter', 'Prescription'];
  if (complexTypes.includes(docType) || textLength > 600) return 'complex';
  if (moderateTypes.includes(docType) || textLength > 200) return 'moderate';
  return 'simple';
}

async function runDecode({ text, imageBase64, language, docType }) {
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
  return parsed;
}

/* ─── POST /api/decode ─── */
router.post('/', async (req, res) => {
  try {
    const { text, imageBase64, language, docType } = req.body;

    const usageCount = parseInt(req.headers['x-usage-count'] || '0', 10);
    const isPaid = req.headers['x-is-paid'] === 'true';
    const bonus = parseInt(req.headers['x-bonus'] || '0', 10);
    const effectiveLimit = 3 + bonus;

    if (usageCount >= effectiveLimit && !isPaid) {
      return res.status(402).json({ error: 'LIMIT_REACHED' });
    }

    const parsed = await runDecode({ text, imageBase64, language, docType });
    const textLen = text ? text.length : 0;

    stats.decodesToday++;
    stats.lastDecodes.unshift({ timestamp: new Date().toISOString(), docType, language });
    if (stats.lastDecodes.length > 10) stats.lastDecodes.pop();

    return res.json({
      success: true,
      result: {
        what_is_this: parsed.what_is_this,
        what_it_means_for_you: parsed.what_it_means_for_you,
        what_to_do_next: parsed.what_to_do_next,
        complexity: computeComplexity(docType, textLen),
      },
    });
  } catch (err) {
    console.error('Decode error:', err);
    return res.status(500).json({ success: false, error: 'Failed to decode. Please try again.' });
  }
});

/* ─── POST /api/decode/pdf ─── */
router.post('/pdf', async (req, res) => {
  try {
    const { pdfBase64, language, docType } = req.body;

    const usageCount = parseInt(req.headers['x-usage-count'] || '0', 10);
    const isPaid = req.headers['x-is-paid'] === 'true';
    const bonus = parseInt(req.headers['x-bonus'] || '0', 10);
    const effectiveLimit = 3 + bonus;

    if (usageCount >= effectiveLimit && !isPaid) {
      return res.status(402).json({ error: 'LIMIT_REACHED' });
    }

    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'No PDF provided.' });
    }

    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      return res.status(500).json({ success: false, error: 'PDF parsing unavailable.' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text ? pdfData.text.trim().slice(0, 4000) : '';

    if (!extractedText) {
      return res.status(400).json({ success: false, error: 'Could not extract text from this PDF. Try copying and pasting the text instead.' });
    }

    const parsed = await runDecode({ text: extractedText, imageBase64: null, language, docType });

    stats.decodesToday++;
    stats.lastDecodes.unshift({ timestamp: new Date().toISOString(), docType, language, source: 'pdf' });
    if (stats.lastDecodes.length > 10) stats.lastDecodes.pop();

    return res.json({
      success: true,
      result: {
        what_is_this: parsed.what_is_this,
        what_it_means_for_you: parsed.what_it_means_for_you,
        what_to_do_next: parsed.what_to_do_next,
        complexity: computeComplexity(docType, extractedText.length),
      },
      extractedLength: extractedText.length,
    });
  } catch (err) {
    console.error('PDF decode error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process PDF. Please try again.' });
  }
});

/* ─── POST /api/decode/followup ─── */
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
    stats.followupsToday++;
    return res.json({ success: true, answer: response.choices[0].message.content });
  } catch (err) {
    console.error('Followup error:', err);
    return res.status(500).json({ success: false, error: 'Could not answer. Please try again.' });
  }
});

module.exports = router;
