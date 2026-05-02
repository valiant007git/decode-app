const express = require('express');
const Groq = require('groq-sdk');
const { stats } = require('../stats');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are Decode — a calm, warm, expert AI that helps everyday people in India understand confusing documents. You have deep knowledge of Indian medical terminology, legal language, banking terms, and government schemes.

ALWAYS respond with ONLY this exact JSON — no markdown, no extra text, nothing else:
{
  "what_is_this": "2-3 clear sentences explaining what type of document this is and its purpose",
  "what_it_means_for_you": "The single most important thing this document means for the person reading it. Use simple everyday words. No jargon.",
  "what_to_do_next": [
    "First specific action step starting with a verb",
    "Second specific action step",
    "Third specific action step"
  ]
}

Rules you must follow:
- Respond in the user's chosen language (Hindi/Bengali/English)
- Write like you are explaining to a trusted family member with no technical background
- For medical documents: explain what the values mean, never diagnose or prescribe
- For legal documents: explain what it says in plain terms, always suggest consulting a lawyer for serious matters
- For bank documents: explain the financial impact clearly
- For government documents: explain what the person is entitled to and what they must do
- Always be warm, calm and reassuring — the user may be stressed or scared
- Keep what_is_this under 3 sentences
- Keep what_it_means_for_you under 4 sentences
- Keep each what_to_do_next step under 15 words
- Never use words like: hereby, aforementioned, pursuant, notwithstanding, whilst
- For complex legal documents: identify the 3 most important clauses that affect the user directly
- For complex medical reports: focus on the most abnormal values and what they mean in plain language
- For financial documents: explain what the numbers mean for the person's money in simple terms
- Always prioritize what the user needs to DO, not just what the document says`;

const FOLLOWUP_PROMPT = `You are Decode assistant helping someone understand a document they just decoded. Answer their follow-up question in simple plain language in their chosen language. Be warm, specific and concise. Maximum 3 sentences. Never use jargon.`;

function computeComplexity(docType, textLength) {
  const complexTypes = ['Legal notice', 'Contract'];
  const moderateTypes = ['Medical report', 'Bank document', 'Govt letter', 'Prescription'];
  if (complexTypes.includes(docType) || textLength > 600) return 'complex';
  if (moderateTypes.includes(docType) || textLength > 200) return 'moderate';
  return 'simple';
}

async function callGroq(messages) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 1024,
  });
  return response.choices[0].message.content;
}

async function callGroqWithRetry(messages) {
  try {
    return await callGroq(messages);
  } catch (firstErr) {
    console.error('Groq first attempt failed, retrying in 2s:', firstErr.message);
    await new Promise(r => setTimeout(r, 2000));
    return await callGroq(messages);
  }
}

async function runDecode({ text, imageBase64, language, docType }) {
  let userMessage;
  if (imageBase64) {
    userMessage = `The user has uploaded an image of a document. Document type is ${docType}. Based on the document type and any text provided, give the best explanation possible. Explain in ${language}.${text ? `\n\nAdditional text from document:\n${text}` : ''}`;
  } else {
    userMessage = `Document type: ${docType}. Explain in ${language}.\n\nContent:\n${text}`;
  }

  const rawText = await callGroqWithRetry([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

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
router.post('/followup', async (req, res) => {
  try {
    const { question, originalText, language } = req.body;

    const rawAnswer = await callGroqWithRetry([
      { role: 'system', content: FOLLOWUP_PROMPT },
      { role: 'user', content: `Document content: ${originalText}\n\nFollow-up question (answer in ${language}): ${question}` },
    ]);

    stats.followupsToday++;
    return res.json({ success: true, answer: rawAnswer });
  } catch (err) {
    console.error('Followup error:', err);
    return res.status(500).json({ success: false, error: 'Could not answer. Please try again.' });
  }
});

module.exports = router;
