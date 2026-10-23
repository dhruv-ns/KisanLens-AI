const axios = require('axios');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

const CANDIDATE_MODELS = [
  config.gemini.model || 'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

/**
 * Robust caller with automatic model fallback for timeouts, 503, 404, 429
 */
async function callGemini(payload, timeout = 15000) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`;
    try {
      const response = await axios.post(url, payload, { timeout });
      return response.data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
      const errMsg = err.response?.data?.error?.message || err.message;
      
      logger.warn(`Gemini model [${model}] failed (${status || (isTimeout ? 'TIMEOUT' : 'NETWORK')}): ${errMsg}`);

      // If it's a client bad request (400), no model will accept it, so rethrow
      if (status === 400) {
        throw err;
      }

      // For timeouts, 503 high demand, 404 retired model, 429 rate limit, 500 server error:
      // seamlessly try the next model candidate
      continue;
    }
  }

  throw lastError;
}

const CROP_ANALYSIS_PROMPT = `You are KisanLens AI, an agricultural decision-support assistant.

Analyze the supplied crop image.

You are NOT an agricultural authority and must not claim definitive diagnosis.
Identify only visible evidence.
Return a cautious preliminary assessment.

Inputs:
Crop: {{crop}}

Analyze:
1. Crop identification
2. Visible symptoms
3. Possible issue
4. Confidence from 0-100
5. Severity (one of: healthy, low, moderate, high, unknown)
6. Evidence/observations
7. Safe immediate actions
8. Whether expert attention is recommended
9. Image quality (good, acceptable, poor)

Rules:
- Never claim certainty.
- Never invent visible symptoms.
- Never invent crop diseases.
- If the image is unclear, say so.
- Do not prescribe dangerous chemical quantities.
- Prefer low-risk general agricultural practices.
- Use simple language.
- Return ONLY valid JSON matching this exact schema:

{
  "crop": "string",
  "possibleIssue": "string",
  "confidence": 0,
  "severity": "healthy|low|moderate|high|unknown",
  "observations": ["string"],
  "recommendedActions": ["string"],
  "expertAttention": "string",
  "imageQuality": "good|acceptable|poor",
  "additionalNotes": "string"
}`;

const ASSISTANT_PROMPT = `You are KisanLens AI Assistant, a helpful, practical, bilingual agricultural advisor for Indian farmers.

You help farmers with:
- Crop health and disease management
- Weather-based agricultural advice
- Practical, low-cost farming solutions
- Organic and chemical treatment options (with safety warnings)
- Market timing and crop planning
- General farming best practices

Rules:
- Never give dangerous advice.
- Avoid unsafe chemical instructions.
- Never invent market prices.
- Never invent weather information.
- Clearly distinguish facts from estimates.
- Recommend professional agricultural help for serious or uncertain situations.
- Be empathetic and supportive.
- Keep answers concise but helpful.

Available context:
Crop: {{crop}}
Crop stage: {{cropStage}}
Location: {{location}}
Latest crop analysis: {{cropAnalysis}}
Current weather: {{weather}}
Market information: {{market}}

User question: {{question}}`;

/**
 * Analyze a crop image using Gemini multimodal API
 */
async function analyzeCropImage(imagePath, crop) {
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png'
    : imagePath.endsWith('.webp') ? 'image/webp'
    : 'image/jpeg';

  const prompt = CROP_ANALYSIS_PROMPT.replace('{{crop}}', crop || 'Unknown');

  try {
    const data = await callGemini({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response from AI model.');
    }

    // Clean potential markdown blocks
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Validate and sanitize
    return {
      crop: parsed.crop || crop || 'Unknown',
      possibleIssue: parsed.possibleIssue || 'Unable to determine',
      confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
      severity: ['healthy', 'low', 'moderate', 'high', 'unknown'].includes(parsed.severity)
        ? parsed.severity : 'unknown',
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      expertAttention: parsed.expertAttention || 'Consult an agricultural expert if symptoms persist.',
      imageQuality: ['good', 'acceptable', 'poor'].includes(parsed.imageQuality)
        ? parsed.imageQuality : 'unknown',
      additionalNotes: parsed.additionalNotes || '',
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('AI service is rate-limited. Please try again in a moment.');
    }
    if (error.response?.status >= 500) {
      throw new Error('AI analysis is temporarily unavailable. Please try again.');
    }
    logger.error('Gemini API error:', error.response?.data?.error?.message || error.message);
    throw new Error(`AI analysis failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Chat with the AI assistant
 */
async function chatWithAssistant(question, context = {}) {
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const prompt = ASSISTANT_PROMPT
    .replace('{{crop}}', context.crop || 'Not specified')
    .replace('{{cropStage}}', context.cropStage || 'Not specified')
    .replace('{{location}}', context.location || 'Not specified')
    .replace('{{cropAnalysis}}', context.cropAnalysis ? JSON.stringify(context.cropAnalysis) : 'Not available')
    .replace('{{weather}}', context.weather ? JSON.stringify(context.weather) : 'Not available')
    .replace('{{market}}', context.market ? JSON.stringify(context.market) : 'Not available')
    .replace('{{question}}', question);

  // Build conversation history
  const contents = [];
  if (context.history && context.history.length > 0) {
    const recentHistory = context.history.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current question with system context
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  try {
    const data = await callGemini({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from AI assistant.');

    return text;
  } catch (error) {
    logger.error('Gemini assistant error:', error.response?.data?.error?.message || error.message);
    throw new Error('AI assistant is temporarily unavailable. Please try again.');
  }
}

module.exports = { analyzeCropImage, chatWithAssistant };
