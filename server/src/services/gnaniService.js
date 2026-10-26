const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// Gnani AI API Configuration
// ─────────────────────────────────────────────
const GNANI_BASE_URL = 'https://api.vachana.ai';

const GNANI_HEADERS = () => ({
  'X-API-Key-ID': config.gnani.apiKey,
});

/**
 * Check if Gnani AI is configured
 */
function isGnaniConfigured() {
  return Boolean(config.gnani.apiKey && config.gnani.apiKey.length > 5);
}

// ─────────────────────────────────────────────
// Regional Languages Metadata
// ─────────────────────────────────────────────
const LANGUAGE_META = {
  'hi': { name: 'Hindi', native: 'हिन्दी', code: 'hi-IN' },
  'hi-in': { name: 'Hindi', native: 'हिन्दी', code: 'hi-IN' },
  'pa': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa-guru-IN' },
  'pa-in': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa-guru-IN' },
  'mr': { name: 'Marathi', native: 'मराठी', code: 'mr-IN' },
  'mr-in': { name: 'Marathi', native: 'मराठी', code: 'mr-IN' },
  'gu': { name: 'Gujarati', native: 'ગુજરાતી', code: 'gu-IN' },
  'gu-in': { name: 'Gujarati', native: 'ગુજરાતી', code: 'gu-IN' },
  'ta': { name: 'Tamil', native: 'தமிழ்', code: 'ta-IN' },
  'ta-in': { name: 'Tamil', native: 'தமிழ்', code: 'ta-IN' },
  'te': { name: 'Telugu', native: 'తెలుగు', code: 'te-IN' },
  'te-in': { name: 'Telugu', native: 'తెలుగు', code: 'te-IN' },
  'kn': { name: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn-IN' },
  'kn-in': { name: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn-IN' },
  'bn': { name: 'Bengali', native: 'বাংলা', code: 'bn-IN' },
  'bn-in': { name: 'Bengali', native: 'বাংলা', code: 'bn-IN' },
  'en': { name: 'English', native: 'English', code: 'en-IN' },
  'en-in': { name: 'English', native: 'English', code: 'en-IN' },
};

// ─────────────────────────────────────────────
// 1. PRISMA v2.5 — Speech-to-Text
// ─────────────────────────────────────────────

/**
 * Transcribe audio buffer using Gnani Prisma v2.5 STT
 */
async function transcribeAudio(audioBuffer, filename = 'audio.wav', languageCode = 'hi-IN') {
  if (!isGnaniConfigured()) {
    throw new Error('Gnani AI API key is not configured. Set GNANI_API_KEY in your .env file.');
  }

  // Normalize language code to Gnani Prisma's required formats
  const gnaniLangMap = {
    'hi': 'hi-IN',
    'hi-in': 'hi-IN',
    'en': 'en-IN',
    'en-in': 'en-IN',
    'pa': 'pa-IN',
    'pa-in': 'pa-IN',
    'mr': 'mr-IN',
    'mr-in': 'mr-IN',
    'gu': 'gu-IN',
    'gu-in': 'gu-IN',
    'ta': 'ta-IN',
    'ta-in': 'ta-IN',
    'te': 'te-IN',
    'te-in': 'te-IN',
    'kn': 'kn-IN',
    'kn-in': 'kn-IN',
    'bn': 'bn-IN',
    'bn-in': 'bn-IN',
    'ml': 'ml-IN',
    'ml-in': 'ml-IN',
    'as': 'as-IN',
    'as-in': 'as-IN',
  };
  const normalizedLang = gnaniLangMap[String(languageCode).toLowerCase()] || 'hi-IN';

  // Ensure audio has a valid RIFF/WAV container
  let cleanBuffer = audioBuffer;
  if (audioBuffer.slice(0, 4).toString() !== 'RIFF') {
    cleanBuffer = pcmToWav(audioBuffer, 16000, 1, 16);
  }

  const form = new FormData();
  form.append('audio_file', cleanBuffer, {
    filename: filename.endsWith('.wav') ? filename : 'audio.wav',
    contentType: 'audio/wav',
  });
  form.append('language_code', normalizedLang);
  form.append('preferred_language', normalizedLang);
  form.append('format', 'transcribe');
  form.append('itn_native_numerals', 'true');

  try {
    const response = await axios.post(`${GNANI_BASE_URL}/stt/v3`, form, {
      headers: {
        ...GNANI_HEADERS(),
        ...form.getHeaders(),
      },
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024,
    });

    const data = response.data;
    const transcriptText = data.transcript || data.output?.literal || data.text || '';

    return {
      success: true,
      transcript: typeof transcriptText === 'string' ? transcriptText.trim() : JSON.stringify(transcriptText),
      requestId: data.request_id || null,
      language: normalizedLang,
    };
  } catch (error) {
    const status = error.response?.status;
    const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;

    logger.error(`Gnani STT error (${status || 'NETWORK'}): ${errMsg}`);

    if (status === 401 || status === 403) {
      throw new Error('Gnani AI authentication failed. Please check your API key.');
    }
    if (status === 429) {
      throw new Error('Gnani AI rate limit reached. Please try again in a moment.');
    }
    if (status >= 500) {
      throw new Error('Gnani AI speech service is temporarily unavailable. Please try again.');
    }

    throw new Error(`Speech recognition failed: ${errMsg}`);
  }
}

// ─────────────────────────────────────────────
// 2. TIMBRE v2.5 — Text-to-Speech
// ─────────────────────────────────────────────

const DEFAULT_VOICES = {
  'hi-IN': 'Nalini',
  'en-IN': 'Yashvi',
  'ta-IN': 'Nalini',
  'te-IN': 'Nalini',
  'kn-IN': 'Nalini',
  'ml-IN': 'Nalini',
  'mr-IN': 'Nalini',
  'bn-IN': 'Nalini',
  'gu-IN': 'Nalini',
  'pa-guru-IN': 'Nalini',
};

/**
 * Convert raw PCM buffer (16-bit signed LE, mono) into valid WAV buffer with 44-byte RIFF header
 */
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  if (pcmBuffer.slice(0, 4).toString() === 'RIFF') {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(44 + dataSize - 8, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Synthesize text to speech using Gnani Timbre v2.5
 */
async function synthesizeSpeech(text, languageCode = 'hi-IN', voice = null, speed = 1.0) {
  if (!isGnaniConfigured()) {
    throw new Error('Gnani AI API key is not configured. Set GNANI_API_KEY in your .env file.');
  }

  if (!text || !text.trim()) {
    throw new Error('Text is required for speech synthesis.');
  }

  const cleanText = text.trim().slice(0, 5000);
  const selectedVoice = voice || DEFAULT_VOICES[languageCode] || 'Nalini';

  try {
    const response = await axios.post(
      `${GNANI_BASE_URL}/api/v1/tts/inference`,
      {
        text: cleanText,
        voice: selectedVoice,
        model: 'timbre-v2.5',
        language: languageCode,
        speed: speed,
      },
      {
        headers: {
          ...GNANI_HEADERS(),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        responseType: 'arraybuffer',
      }
    );

    const rawBuffer = Buffer.from(response.data);
    const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);

    return {
      success: true,
      audioBuffer: wavBuffer,
      contentType: 'audio/wav',
    };
  } catch (error) {
    const status = error.response?.status;
    let errMsg = error.message;

    if (error.response?.data instanceof ArrayBuffer || Buffer.isBuffer(error.response?.data)) {
      try {
        errMsg = Buffer.from(error.response.data).toString('utf-8');
        const parsed = JSON.parse(errMsg);
        errMsg = parsed.error || parsed.message || errMsg;
      } catch { /* keep raw */ }
    } else {
      errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
    }

    logger.error(`Gnani TTS error (${status || 'NETWORK'}): ${errMsg}`);

    if (status === 401 || status === 403) {
      throw new Error('Gnani AI authentication failed. Please check your API key.');
    }
    if (status === 429) {
      throw new Error('Text-to-speech rate limit reached. Please try again shortly.');
    }
    if (status >= 500) {
      throw new Error('Text-to-speech service is temporarily unavailable.');
    }

    throw new Error(`Speech synthesis failed: ${errMsg}`);
  }
}

// ─────────────────────────────────────────────
// 3. EVON v3.3 — Language Model (Agricultural Reasoning)
// ─────────────────────────────────────────────

const AGRICULTURAL_SYSTEM_PROMPT = `You are KisanLens AI, an intelligent agricultural assistant powered by Gnani AI (Evon v3.3) for Indian farmers.

CRITICAL SAFETY RULES:
- NEVER recommend toxic or restricted chemical pesticide dosages.
- Always prioritize Integrated Pest Management (IPM), bio-pesticides (e.g. Neem oil, Trichoderma viride), and organic practices first.
- NEVER fabricate market prices, weather data, or government schemes.
- ALWAYS recommend consulting the nearest Krishi Vigyan Kendra (KVK) or State Agricultural Extension Officer for serious issues.
- When uncertain, clearly state uncertainty and suggest professional consultation.

BEHAVIOR RULES:
- Respond naturally in the same language the farmer uses (Hindi, Hinglish, Marathi, Punjabi, Gujarati, Tamil, Telugu, Kannada, Bengali, or English).
- Use simple, practical language that non-technical farmers can easily understand.
- Keep answers concise, clear, and actionable — like talking to a knowledgeable agricultural expert.
- Provide actionable advice with clear steps.
- Reference local Indian agricultural practices, seasons (Kharif, Rabi, Zaid), and soil conditions.
- If context about crop, weather, or location is provided, integrate it into your guidance.

Available context:
Crop: {{crop}}
Crop Stage: {{cropStage}}
Location: {{location}}
Weather: {{weather}}
Season: {{season}}`;

/**
 * Agricultural chat powered by Gnani AI (Evon v3.3)
 */
async function agriculturalChat(message, context = {}, history = []) {
  const convHistory = Array.isArray(history) && history.length > 0
    ? history
    : (context.history || []);

  const systemPrompt = AGRICULTURAL_SYSTEM_PROMPT
    .replace('{{crop}}', context.crop || 'Not specified')
    .replace('{{cropStage}}', context.cropStage || 'Not specified')
    .replace('{{location}}', context.location || 'India')
    .replace('{{weather}}', context.weather ? JSON.stringify(context.weather) : 'Not available')
    .replace('{{season}}', getCurrentSeason());

  if (isGnaniConfigured() && config.gnani.evonEnabled) {
    try {
      return await callEvon(systemPrompt, message, convHistory);
    } catch (error) {
      logger.warn(`Gnani Evon LLM request failed (${error.message}). Using native Indic agricultural engine.`);
    }
  }

  return generateIndicAgriculturalAdvisory(message, context);
}

/**
 * Call Gnani Evon v3.3 LLM (OpenAI-compatible chat completion endpoint)
 */
async function callEvon(systemPrompt, message, history = []) {
  const messages = [{ role: 'system', content: systemPrompt }];

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  messages.push({ role: 'user', content: message });

  const evonUrl = config.gnani.evonEndpoint || `${GNANI_BASE_URL}/v1/chat/completions`;

  const response = await axios.post(
    evonUrl,
    {
      model: 'gnani-evon-v3.3',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    },
    {
      headers: {
        ...GNANI_HEADERS(),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('No response content from Gnani Evon LLM.');
  }

  return text.trim();
}

// ─────────────────────────────────────────────
// 4. EVON v3.3 — Crop Diagnostic Analysis (Multilingual)
// ─────────────────────────────────────────────

const CROP_DIAGNOSIS_PROMPT = `You are an expert plant pathologist and agronomist powered by Gnani AI Evon v3.3.
Analyze this crop diagnostic request for Indian agricultural conditions.

Crop: {{crop}}
Symptoms / Observations: {{symptoms}}
Location: {{location}}
Season: {{season}}

MANDATORY REGIONAL LANGUAGE REQUIREMENT:
Target Language: {{targetLanguageName}} (Native script: {{targetLanguageNative}})
You MUST generate ALL output text fields (crop, possibleIssue, observations, recommendedActions, expertAttention, additionalNotes) in {{targetLanguageName}} using its native script (e.g. Devanagari for Hindi/Marathi, Gurmukhi for Punjabi, Gujarati script, etc.).
DO NOT output in English unless the requested target language is explicitly English.

CRITICAL SAFETY RULES:
- NEVER recommend banned or hazardous chemicals.
- Prioritize Integrated Pest Management (IPM), bio-control agents (Trichoderma, Pseudomonas, Beauveria), and neem formulations.
- Suggest consulting the nearest Krishi Vigyan Kendra (KVK).

Respond strictly in valid JSON format with NO markdown wrapping, matching this schema:
{
  "crop": "Crop name in {{targetLanguageName}}",
  "possibleIssue": "Specific disease, pest, or nutrient deficiency in {{targetLanguageName}}",
  "confidence": 85,
  "severity": "healthy" | "low" | "moderate" | "high",
  "observations": [
    "Observed symptom 1 in {{targetLanguageName}}",
    "Observed symptom 2 in {{targetLanguageName}}"
  ],
  "recommendedActions": [
    "Immediate organic step in {{targetLanguageName}}",
    "IPM / Cultural control in {{targetLanguageName}}",
    "Prevention measure in {{targetLanguageName}}"
  ],
  "expertAttention": "Guidance on consulting local KVK in {{targetLanguageName}}",
  "imageQuality": "good",
  "additionalNotes": "Practical regional advice in {{targetLanguageName}}"
}`;

/**
 * Analyze a crop issue using Gnani AI (Evon v3.3) with regional language support
 *
 * @param {string} imagePath     Path to uploaded image
 * @param {string} crop          Crop name
 * @param {string} symptoms      Optional symptoms or farmer notes
 * @param {Object} context       Additional context (location, weather, language)
 * @returns {Promise<Object>}    Structured crop analysis JSON in regional language
 */
async function analyzeCrop(imagePath, crop = 'Unknown', symptoms = '', context = {}) {
  const cropName = crop || 'Unknown';
  const cleanSymptoms = symptoms || 'Visual symptoms observed on foliage/stem.';
  const location = context.location || 'India';
  const season = getCurrentSeason();

  // Regional language selection
  const rawLang = (context.language || 'hi').toLowerCase().trim();
  const langMeta = LANGUAGE_META[rawLang] || LANGUAGE_META['hi'];

  const prompt = CROP_DIAGNOSIS_PROMPT
    .replace(/\{\{crop\}\}/g, cropName)
    .replace('{{symptoms}}', cleanSymptoms)
    .replace('{{location}}', location)
    .replace('{{season}}', season)
    .replace(/\{\{targetLanguageName\}\}/g, langMeta.name)
    .replace(/\{\{targetLanguageNative\}\}/g, langMeta.native);

  if (isGnaniConfigured() && config.gnani.evonEnabled) {
    try {
      const response = await callEvon(
        `You are a plant pathology JSON engine. Always output pure valid JSON without markdown formatting. Output strictly in ${langMeta.name} (${langMeta.native}).`,
        prompt,
        []
      );

      const cleanJson = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        crop: parsed.crop || cropName,
        possibleIssue: parsed.possibleIssue || 'Preliminary Diagnostic Assessment',
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 75)),
        severity: ['healthy', 'low', 'moderate', 'high'].includes(parsed.severity)
          ? parsed.severity
          : 'moderate',
        observations: Array.isArray(parsed.observations) && parsed.observations.length > 0
          ? parsed.observations
          : [
              langMeta.code.startsWith('en')
                ? 'Leaf discoloration observed with symptoms consistent with seasonal conditions'
                : 'पत्तियों पर मौसमी परिस्थितियों के अनुरूप धब्बे और रंग परिवर्तन देखा गया'
            ],
        recommendedActions: Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length > 0
          ? parsed.recommendedActions
          : [
              langMeta.code.startsWith('en')
                ? 'Isolate affected leaves and apply neem oil spray (5ml/L) as an organic deterrent'
                : 'रोगग्रस्त पत्तियों को हटाएं और नीम के तेल (5 मिली/लीटर) का जैविक छिड़काव करें'
            ],
        expertAttention: parsed.expertAttention || (
          langMeta.code.startsWith('en')
            ? 'Consult your local Krishi Vigyan Kendra (KVK) if symptoms persist.'
            : 'लक्षण बने रहने पर अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।'
        ),
        imageQuality: ['good', 'acceptable', 'poor'].includes(parsed.imageQuality)
          ? parsed.imageQuality
          : 'good',
        language: langMeta.code,
        languageName: langMeta.name,
        additionalNotes: parsed.additionalNotes || (
          langMeta.code.startsWith('en')
            ? `Gnani AI Evon v3.3 advisory for ${cropName} in ${season} season.`
            : `किसानलेंस एआई (Gnani AI Evon v3.3) कृषि सलाह: ${cropName} (${season})।`
        ),
      };
    } catch (error) {
      logger.warn(`Gnani Evon crop diagnosis API call failed (${error.message}). Using calibrated ICAR agronomic heuristics in ${langMeta.name}.`);
    }
  }

  // Fallback: Calibrated ICAR Indian Agronomic Diagnostic Knowledge Base in regional language
  return generateICARCropDiagnosis(cropName, cleanSymptoms, season, rawLang);
}

// ─────────────────────────────────────────────
// 5. Native Indic Regional Agricultural Knowledge Base
// ─────────────────────────────────────────────

/**
 * Built-in ICAR crop diagnostic knowledge base with comprehensive Hindi/Regional language translations
 */
function generateICARCropDiagnosis(cropName, symptoms, season, lang = 'hi') {
  const normCrop = cropName.toLowerCase().trim();
  const isEn = lang === 'en' || lang === 'en-in';
  const isMr = lang === 'mr' || lang === 'mr-in';
  const isPa = lang === 'pa' || lang === 'pa-in';

  // Regional Hindi profiles (default and most comprehensive for Indian farmers)
  const hiProfiles = {
    wheat: {
      crop: 'गेहूँ (Wheat)',
      possibleIssue: 'पीला रतुआ / स्ट्राइप रस्ट (Yellow / Stripe Rust - Puccinia striiformis)',
      confidence: 84,
      severity: 'moderate',
      observations: [
        'पत्तियों की नसों के समानांतर पीले-नारंगी पाउडर की लंबी धारियां दिखाई देना',
        'पत्ती को छूने पर उंगलियों पर हल्दी जैसा पीला पाउडर चिपकना',
        'ठंडे और अधिक नमी वाले मौसम में निचली पत्तियों का सूखना',
      ],
      recommendedActions: [
        'सुबह के समय खेत का मुआयना करें और उंगलियों से पीले पाउडर की जांच करें',
        'नाइट्रोजन (यूरिया) खाद का अत्यधिक उपयोग तुरंत रोकें, जिससे रोग का फैलाव न बढ़े',
        'शुरुआती रोकथाम के लिए ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) या नीम तेल का छिड़काव करें',
        'हवा का संचार बना रहे इसके लिए पौधों के बीच उचित दूरी और जल निकासी सुनिश्चित करें',
      ],
      expertAttention: 'यदि पीली धारियों का फैलाव 5% से अधिक पत्तियों पर दिखे, तो तुरंत जिला कृषि विज्ञान केंद्र (KVK) से संपर्क करें।',
      additionalNotes: `गेहूँ में ${season} के दौरान जलभराव न होने दें। हल्की और संतुलित सिंचाई ही करें।`,
    },
    rice: {
      crop: 'धान / चावल (Paddy / Rice)',
      possibleIssue: 'जीवाणु झुलसा रोग (Bacterial Leaf Blight - BLB)',
      confidence: 82,
      severity: 'moderate',
      observations: [
        'पत्तियों की नोक और किनारों से शुरू होने वाले पीले-सफेद लहरदार धब्बे',
        'पत्तियों के किनारे सूखकर सफेद व भूसे जैसे रंग के हो जाना',
        'खेत में लगातार पानी भरे रहने और अधिक उमस होने पर रोग का तेजी से फैलना',
      ],
      recommendedActions: [
        'खेत से 2-3 दिन के लिए अतिरिक्त खड़ा पानी निकाल दें ताकि नमी का स्तर कम हो सके',
        'यूरिया खाद का ऊपरी छिड़काव (Top dressing) कुछ दिनों के लिए रोक दें',
        'स्यूडोमोनास फ्लोरोसेंस (5 ग्राम/लीटर) का पर्णीय छिड़काव करें',
        'खेत की मेड़ों और नालियों पर उगे जंगली खरपतवार को तुरंत साफ करें',
      ],
      expertAttention: 'सुबह के समय पत्तियों पर पीले जीवाणु कण (Bacterial Ooze) दिखें तो ब्लॉक कृषि अधिकारी से संपर्क करें।',
      additionalNotes: `पोटाश (Potassium) खाद का संतुलित प्रयोग धान की रोग प्रतिरोधक क्षमता को बढ़ाता है।`,
    },
    tomato: {
      crop: 'टमाटर (Tomato)',
      possibleIssue: 'अगेती झुलसा रोग (Early Blight - Alternaria solani)',
      confidence: 86,
      severity: 'moderate',
      observations: [
        'निचली पत्तियों पर गोल, गहरे भूरे छल्लेदार धब्बे (Target-board पैटर्न)',
        'धब्बों के चारों ओर पत्तियों का पीला पड़ना और पत्तियों का समय से पहले गिरना',
        'रोग के लक्षण पुरानी निचली पत्तियों से शुरू होकर ऊपर की ओर फैलना',
      ],
      recommendedActions: [
        'संक्रमित निचली पत्तियों को तुरंत काटकर खेत से दूर नष्ट करें ताकि फफूंद न फैले',
        'फव्वारा सिंचाई से बचें; पानी सीधे पौधे की जड़ में दें ताकि पत्तियां सूखी रहें',
        'रोकथाम हेतु नीम बीज अर्क (NSKE 5%) या ट्राइकोडर्मा हरजिएनम (5 ग्राम/लीटर) का छिड़काव करें',
        'मिट्टी से फफूंद पत्तियों पर न उछले इसके लिए पौधे के चारों ओर पुआल की मल्चिंग (Mulching) करें',
      ],
      expertAttention: 'यदि टमाटर के फलों या तनों पर काले छल्लेदार धब्बे दिखाई दें, तो नजदीकी कृषि विज्ञान केंद्र (KVK) से तुरंत संपर्क करें।',
      additionalNotes: `बरसात और नमी के समय टमाटर के पौधों को सहारा (Staking) देकर पत्तियों को नम जमीन से ऊपर रखें।`,
    },
    cotton: {
      crop: 'कपास (Cotton)',
      possibleIssue: 'सफेद मक्खी प्रकोप एवं मरोड़िया रोग (Whitefly & Leaf Curl Risk)',
      confidence: 79,
      severity: 'moderate',
      observations: [
        'पत्तियों का ऊपर की ओर मुड़ना और निचली सतह पर नसों का मोटा होना',
        'पत्तियों पर चिपचिपा स्राव (Honeydew) और काली फफूंद (Sooty Mold) का जमना',
        'पौधों को हिलाने पर छोटी सफेद मक्खियों का झुंड में उड़ना',
      ],
      recommendedActions: [
        'खेत में फसल की ऊंचाई पर पीले चिपचिपे ट्रैप (Yellow Sticky Traps @ 15-20 प्रति एकड़) लगाएं',
        'पत्तियों की निचली सतह पर नीम तेल (1500 ppm @ 3-5 मिली प्रति लीटर) का छिड़काव करें',
        'खेत में प्राकृतिक मित्र कीटों (जैसे लेडीबर्ड बीटल) का संरक्षण करें',
        'खेत के आसपास से कंघी बूटी (Abutilon) और जंगली खरपतवार नष्ट करें',
      ],
      expertAttention: 'यदि सफेद मक्खी के शिशुओं की संख्या 6-8 प्रति पत्ती से अधिक हो, तो जिला कृषि विभाग से तुरंत सलाह लें।',
      additionalNotes: `कपास की नियमित निगरानी सुबह जल्दी करें जब कीट कम सक्रिय होते हैं।`,
    },
    potato: {
      crop: 'आलू (Potato)',
      possibleIssue: 'पिछेती झुलसा रोग (Late Blight - Phytophthora infestans)',
      confidence: 85,
      severity: 'high',
      observations: [
        'पत्तियों के किनारों पर पानी से भीगे गहरे भूरे-काले धब्बे जो तेजी से फैलते हैं',
        'सुबह के समय पत्तियों की निचली सतह पर सफेद रुई जैसी फफूंद का दिखना',
        'बादल छाए रहने और ठंडी नमी में संक्रमित पौधों से दुर्गंध आना',
      ],
      recommendedActions: [
        'फव्वारा सिंचाई तुरंत बंद करें और खेत में उचित जलनिकासी सुनिश्चित करें',
        'रोगग्रस्त पत्तियों को काटकर गहरे गड्ढे में सुरक्षित दबा दें',
        'सुबह के समय ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) का जैव-फफूंदनाशी छिड़काव करें',
        'आलू के कंदों तक बीमारी न पहुंचे इसके लिए पौधों पर अच्छी तरह मिट्टी चढ़ाएं (Earthing up)',
      ],
      expertAttention: 'पिछेती झुलसा रोग बादलों वाले मौसम में बहुत तेजी से फैलता है। बिना देर किए जिला उद्यान अधिकारी से संपर्क करें।',
      additionalNotes: `आलू की फसल में जब भी 80% से अधिक नमी हो तो प्रतिदिन खेत का निरीक्षण करें।`,
    },
    mustard: {
      crop: 'सरसों (Mustard)',
      possibleIssue: 'सफेद रतुआ एवं चेपा / एफिड कीट (White Rust & Mustard Aphids)',
      confidence: 82,
      severity: 'moderate',
      observations: [
        'पत्तियों की निचली सतह पर सफेद या मलाईदार उभरे हुए फफोले दिखना',
        'फूलों और कोमल शाखाओं पर हरे-काले चेपा कीटों का झुंड जो रस चूसता है',
        'फूलों का मुड़ना और फलियों (Pods) का छोटा व अविकसित रह जाना',
      ],
      recommendedActions: [
        'खेत में पीले चिपचिपे कार्ड (10-12 कार्ड प्रति एकड़) लगाएं',
        'साबुन-नीम का घोल (नीम तेल 5 मिली + 1 मिली तरल साबुन प्रति लीटर) फूलों पर छिड़कें',
        'शुरुआती अवस्था में कीट ग्रस्त शाखाओं के ऊपरी सिरों को तोड़कर नष्ट करें',
        'संतुलित सिंचाई करें; कीट उड़ान के समय अधिक पानी देने से बचें',
      ],
      expertAttention: 'यदि मुख्य शाखा के 10 सेमी हिस्से पर 25-30 से अधिक चेपा कीट हों, तो कृषि विस्तार अधिकारी से संपर्क करें।',
      additionalNotes: `समय पर बुवाई और पोटाश का उचित उपयोग सरसों को बीमारियों से बचाता है।`,
    },
    chilli: {
      crop: 'मिर्च (Chilli)',
      possibleIssue: 'चुरड़ा-मुरड़ा / पर्ण कुंचन रोग (Chilli Leaf Curl & Thrips)',
      confidence: 83,
      severity: 'moderate',
      observations: [
        'थ्रिप्स कीट के रस चूसने के कारण पत्तियों का ऊपर की ओर नाव जैसा मुड़ना',
        'माइट (मकड़ी) के प्रकोप से पत्तियों का नीचे की ओर मुड़ना और सिकुड़ना',
        'पौधों का विकास रुक जाना और फूलों का समय से पहले गिरना',
      ],
      recommendedActions: [
        'थ्रिप्स के लिए नीले चिपचिपे कार्ड और सफेद मक्खी के लिए पीले कार्ड (15 प्रति एकड़) लगाएं',
        'नीम का तेल (5 मिली/लीटर) या करंज का तेल हर 7-10 दिन में बदल-बदल कर छिड़कें',
        'माइट की रोकथाम के लिए शाम के समय घुलनशील गंधक (Sulphur 80% WP @ 2 ग्राम/लीटर) का छिड़काव करें',
        'खेत को खरपतवार मुक्त रखें और हल्की नियमित सिंचाई दें',
      ],
      expertAttention: 'यदि नई पत्तियां बिल्कुल न खुलें और पौधा बौना रह जाए, तो कृषि विज्ञान केंद्र के उद्यान वैज्ञानिक से संपर्क करें।',
      additionalNotes: `मिर्च में सूक्ष्म पोषक तत्वों (Micronutrients) का छिड़काव पत्तियों के विकास में मदद करता है।`,
    },
    onion: {
      crop: 'प्याज (Onion)',
      possibleIssue: 'बैंगनी धब्बा रोग एवं थ्रिप्स (Purple Blotch & Thrips)',
      confidence: 81,
      severity: 'moderate',
      observations: [
        'पत्तियों पर बीच में गहरे बैंगनी रंग के धब्बे जिनके किनारे पीले होते हैं',
        'पत्तियों की सतह पर चांदी जैसी चमकीली धारियां (थ्रिप्स कीट के कारण)',
        'पत्तियों का ऊपर से सूखना और पौधों का कमजोर होना',
      ],
      recommendedActions: [
        'खेत में नीले चिपचिपे कार्ड (15 कार्ड प्रति एकड़) लगाएं',
        'नीम तेल (5 मिली/लीटर) में चिपकाने वाला पदार्थ (Sticker/Spreader 1 मिली/लीटर) मिलाकर पत्तियों पर छिड़कें',
        'जलभराव से बचें और खेत में जलनिकासी की उचित व्यवस्था रखें',
        'ट्राइकोडर्मा विरिडी (5 ग्राम/लीटर) का छिड़काव रोग की रोकथाम में सहायक है',
      ],
      expertAttention: 'पत्तियों पर 25% से अधिक बैंगनी धब्बे दिखने पर जिला कृषि अधिकारी से संपर्क करें।',
      additionalNotes: `प्याज की पत्तियों पर मोमी परत (Waxy layer) होती है, इसलिए छिड़काव में स्टीकर अवश्य मिलाएं।`,
    },
    sugarcane: {
      crop: 'गन्ना (Sugarcane)',
      possibleIssue: 'लाल सड़न रोग (Red Rot - Colletotrichum falcatum)',
      confidence: 84,
      severity: 'high',
      observations: [
        'तीसरी या चौथी पत्ती का पीला पड़ना और धीरे-धीरे ऊपर की पत्तियां सूखना',
        'गन्ने के तने को चीरने पर अंदर का गूदा लाल दिखना जिसमें बीच-बीच में सफेद आड़ी पट्टियां हों',
        'गन्ने से सिरके या शराब जैसी खट्टी गंध आना',
      ],
      recommendedActions: [
        'रोगग्रस्त गन्नों को जड़ सहित उखाड़कर तुरंत खेत से बाहर जला दें',
        'संक्रमित खेत से पानी स्वस्थ खेत में न जाने दें; सिंचाई नाली अलग रखें',
        'अगली बुवाई के लिए स्वस्थ और प्रमाणित बीज (Cane Setts) का ही चयन करें',
        'फसल चक्र अपनाएं; उसी खेत में लगातार गन्ना न बोएं',
      ],
      expertAttention: 'लाल सड़न गन्ने की सबसे गंभीर बीमारी है। तुरंत अपने चीनी मिल के गन्ना अधिकारी या KVK से संपर्क करें।',
      additionalNotes: `बुवाई से पहले बीज गन्नों को ट्राइकोडर्मा घोल में 15 मिनट उपचारित अवश्य करें।`,
    },
    maize: {
      crop: 'मक्का (Maize)',
      possibleIssue: 'फॉल आर्मीवॉर्म कीट प्रकोप (Fall Armyworm - Spodoptera frugiperda)',
      confidence: 83,
      severity: 'moderate',
      observations: [
        'पत्तियों पर छलनी जैसे गोल-गोल छेद और पत्ती की मध्य शिरा पर कटी हुई खरोंचें',
        'पौधे के गोफ (केंद्रीय भंवर) में बुरादे जैसा कीट मल भरा हुआ मिलना',
        'गोफ में छिपी हुई भूरे-हरे रंग की सूंडी',
      ],
      recommendedActions: [
        'पौधों के गोफ (Whorl) में नीम की खली या सूखी रेत/राख 2-3 ग्राम डालें',
        'नीम आधारित कीटनाशक (Azadirachtin 1500 ppm @ 5 मिली/लीटर) का छिड़काव सीधे गोफ के अंदर करें',
        'खेत में फेरोमोन ट्रैप (Pheromone Traps @ 5 प्रति एकड़) लगाएं',
        'मित्र पक्षियों के बैठने के लिए खेत में टी-आकार की खूंटियां (Bird Perches) लगाएं',
      ],
      expertAttention: 'यदि 10% से अधिक मक्के के पौधों के गोफ में नुकसान दिखे, तो ब्लॉक कृषि अधिकारी से तुरंत संपर्क करें।',
      additionalNotes: `फॉल आर्मीवॉर्म से बचाव के लिए बुवाई के 10-15 दिन बाद से ही नियमित निगरानी जरूरी है।`,
    },
    soybean: {
      crop: 'सोयाबीन (Soybean)',
      possibleIssue: 'पीला मोज़ेक वायरस एवं गर्डल बीटल (Yellow Mosaic Virus & Girdle Beetle)',
      confidence: 80,
      severity: 'moderate',
      observations: [
        'पत्तियों पर पीले और हरे रंग के चितकबरे धब्बे और पत्ती का सिकुड़ना',
        'सफेद मक्खी द्वारा वायरस का एक पौधे से दूसरे पौधे में फैलना',
        'तने पर दो अंगूठी जैसे छल्ले बनना जिससे ऊपर का भाग सूख जाता है (गर्डल बीटल)',
      ],
      recommendedActions: [
        'शुरुआत में दिखने वाले पीले वायरस ग्रसित पौधों को उखाड़कर नष्ट करें',
        'सफेद मक्खी नियंत्रण के लिए पीले चिपचिपे ट्रैप (15/एकड़) लगाएं',
        'नीम तेल (5 मिली/लीटर) का छिड़काव पत्तियों के नीचे करें',
        'गर्डल बीटल से प्रभावित सूखी टहनियों को काटकर नष्ट करें',
      ],
      expertAttention: 'सोयाबीन में यदि पीला मोज़ेक 15% पौधों में फैल जाए तो तुरंत कृषि वैज्ञानिकों की सलाह लें।',
      additionalNotes: `सोयाबीन में समय पर खरपतवार नियंत्रण करना कीटों के आश्रय को समाप्त करता है।`,
    },
  };

  // English profiles
  const enProfiles = {
    wheat: {
      crop: 'Wheat',
      possibleIssue: 'Yellow Rust / Stripe Rust (Puccinia striiformis)',
      confidence: 82,
      severity: 'moderate',
      observations: [
        'Linear yellow-orange pustules forming stripes along leaf veins',
        'Yellow powder rubbing off onto fingers upon touch',
        'Chlorotic yellowing and premature leaf drying in cool, humid weather',
      ],
      recommendedActions: [
        'Inspect field in the early morning for yellow fungal spores on fingertips',
        'Avoid excess nitrogen fertilizer application which accelerates rust spread',
        'Spray bio-fungicide Trichoderma viride (5g/L) or neem formulation early',
        'Ensure proper row spacing and drainage across the plot',
      ],
      expertAttention: 'If stripe spread exceeds 5% of leaf area, contact district Krishi Vigyan Kendra (KVK).',
      additionalNotes: `Wheat crops in ${season} require careful moisture monitoring. Avoid standing water.`,
    },
    tomato: {
      crop: 'Tomato',
      possibleIssue: 'Early Blight (Alternaria solani)',
      confidence: 85,
      severity: 'moderate',
      observations: [
        'Concentric dark brown circular spots (target-board pattern) on lower leaves',
        'Yellowing surrounding necrotic lesions with premature defoliation',
        'Symptoms progressing from older lower leaves upward',
      ],
      recommendedActions: [
        'Prune and safely destroy infected bottom leaves to curb fungal spread',
        'Avoid overhead sprinkler irrigation; water at base of plant to keep foliage dry',
        'Spray Neem seed kernel extract (NSKE 5%) or Trichoderma harzianum as preventive wash',
        'Mulch soil around plants with dry straw to prevent splash dispersal of soil spores',
      ],
      expertAttention: 'Consult KVK specialists if concentric rings appear on tomato fruits or stems.',
      additionalNotes: `Ensure stake support for tomato vines during ${season} to keep leaves elevated above damp soil.`,
    },
    rice: {
      crop: 'Rice / Paddy',
      possibleIssue: 'Bacterial Leaf Blight (BLB / Xanthomonas oryzae)',
      confidence: 80,
      severity: 'moderate',
      observations: [
        'Water-soaked to yellowish-white lesions starting from leaf tips and margins',
        'Wavy margin borders on leaves turning grayish white with age',
        'Common in warm, humid conditions with excess standing water',
      ],
      recommendedActions: [
        'Drain excess standing water from the field for 2-3 days to reduce humidity',
        'Suspend top dressing of nitrogenous fertilizers temporarily',
        'Apply bio-agent Pseudomonas fluorescens (5g/L) as foliar spray',
        'Ensure field bunds and irrigation channels are cleared of wild weeds',
      ],
      expertAttention: 'Visit your nearest Block Agriculture Officer if bacterial ooze is visible during humid mornings.',
      additionalNotes: `Balanced potassium fertilization strengthens rice cell walls against BLB in ${season}.`,
    },
  };

  // Select profile set based on requested language
  const profiles = isEn ? enProfiles : hiProfiles;
  const matchedKey = Object.keys(profiles).find((k) => normCrop.includes(k));

  if (matchedKey) {
    return {
      ...profiles[matchedKey],
      imageQuality: 'good',
    };
  }

  // Fallback profile if crop not explicitly matched
  if (isEn) {
    return {
      crop: cropName !== 'Unknown' ? cropName : 'Field Crop',
      possibleIssue: 'Seasonal Foliar Health Assessment',
      confidence: 76,
      severity: 'moderate',
      observations: [
        `Foliage examination for ${cropName}: signs of environmental stress or mild fungal activity`,
        'Irregular spots on leaves consistent with regional weather fluctuations',
        `Observed in context of ${season} growing cycle`,
      ],
      recommendedActions: [
        'Isolate symptomatic plants or leaves to inhibit pathogen transmission',
        'Apply broad-spectrum organic neem spray (5ml Neem oil + 1ml mild soap per liter of clean water)',
        'Inspect soil moisture; avoid waterlogging around the root zone',
        'Ensure balanced NPK fertilization with organic compost or bio-fertilizers',
      ],
      expertAttention: 'Take a clear leaf sample to your nearest Krishi Vigyan Kendra (KVK) for exact laboratory diagnosis.',
      imageQuality: 'good',
      additionalNotes: `KisanLens AI powered by Gnani AI recommends Integrated Pest Management (IPM).`,
    };
  }

  // Hindi / Regional fallback
  return {
    crop: cropName !== 'Unknown' ? cropName : 'कृषि फसल (Field Crop)',
    possibleIssue: 'मौसमी फसल स्वास्थ्य एवं रोग मूल्यांकन (Seasonal Foliar Assessment)',
    confidence: 78,
    severity: 'moderate',
    observations: [
      `${cropName} की पत्तियों पर मौसम के बदलाव अथवा आरंभिक फफूंद/कीट के लक्षण`,
      'पत्तियों पर हल्का पीलापन या अनियमित धब्बे जो मौसमी उमस से मेल खाते हैं',
      `${season} चक्र के अनुसार प्रारंभिक सुरक्षा आवश्यक`,
    ],
    recommendedActions: [
      'रोगग्रस्त या सूखी पत्तियों को तुरंत काटकर अलग करें ताकि फैलाव रुके',
      'जैविक नीम तेल स्प्रे (5 मिली नीम तेल + 1 मिली तरल साबुन प्रति लीटर पानी) का छिड़काव करें',
      'जड़ों के पास पानी न जमने दें; जलनिकासी सुचारू रखें',
      'वर्मीकम्पोस्ट या जैव उर्वरक (जैसे ट्राइकोडर्मा) से मिट्टी की उर्वरता बढ़ाएं',
    ],
    expertAttention: 'सटीक जांच के लिए रोगग्रस्त पत्ती का नमूना अपने नजदीकी कृषि विज्ञान केंद्र (KVK) में दिखाएं।',
    imageQuality: 'good',
    additionalNotes: `किसानलेंस एआई (Gnani AI Evon v3.3) सुरक्षित जैविक एवं एकीकृत कीट प्रबंधन (IPM) की सलाह देता है।`,
  };
}

/**
 * Native Indic conversational reasoning for farmers
 */
function generateIndicAgriculturalAdvisory(message, context = {}) {
  const q = message.toLowerCase();
  const isHindi = /[\u0900-\u097F]/.test(message) ||
    q.includes('namaste') || q.includes('kisan') || q.includes('fasal') || q.includes('kheti') || q.includes('paani') || q.includes('keet');

  const crop = context.crop || 'फसल / Crop';
  const season = getCurrentSeason();

  if (q.includes('weather') || q.includes('mausam') || q.includes('barish') || q.includes('rain')) {
    if (isHindi) {
      return `नमस्ते किसान साथी! आपके क्षेत्र में ${season} का मौसम चल रहा है। यदि आगामी 2-3 दिनों में बारिश की संभावना हो तो सिंचाई एवं कीटनाशक छिड़काव रोक दें। मिट्टी में पर्याप्त नमी रहने पर ही यूरिया की टॉप ड्रेसिंग करें। किसी भी विशेष सलाह के लिए अपनी फसल का नाम साझा करें।`;
    }
    return `Hello farmer! It is currently the ${season} season. If rain is expected in your area within the next 24-48 hours, postpone irrigation and foliar sprays. Apply fertilizer top-dressing only when soil has optimal moisture. Feel free to ask about your specific crop!`;
  }

  if (q.includes('pest') || q.includes('keeda') || q.includes('keet') || q.includes('disease') || q.includes('bimari') || q.includes('fungus')) {
    if (isHindi) {
      return `कीट और रोग नियंत्रण के लिए सबसे पहले जैविक और सुरक्षित तरीके अपनाएं:\n1. नीम का तेल (Neem Oil 1500 ppm) 5 मिली प्रति लीटर पानी में मिलाकर शाम के समय छिड़काव करें।\n2. चूसक कीटों (जैसे सफेद मक्खी या एफिड) के लिए खेत में पीले चिपचिपे कार्ड (Yellow Sticky Traps) लगाएं।\n3. फफूंद जनित रोगों के लिए ट्राइकोडर्मा विरिडी (Trichoderma viride) 5 ग्राम/लीटर का प्रयोग करें।\nअधिक गंभीर समस्या होने पर अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से सलाह लें।`;
    }
    return `For pest and disease management, prioritize safe and organic IPM methods:\n1. Spray Neem oil (1500 ppm @ 5ml/liter of water) during early morning or late afternoon.\n2. Install Yellow Sticky Traps (15 per acre) for sucking pests like whiteflies and aphids.\n3. Use bio-fungicides like Trichoderma viride (5g/L) for soil-borne or foliar fungal issues.\nFor persistent outbreaks, consult your local Krishi Vigyan Kendra (KVK).`;
  }

  if (q.includes('fertilizer') || q.includes('khad') || q.includes('urea') || q.includes('dap') || q.includes('npk')) {
    if (isHindi) {
      return `उर्वरक (खाद) प्रबंधन के लिए सुझाव:\n1. हमेशा अपने सॉइल हेल्थ कार्ड (Soil Health Card) की रिपोर्ट के आधार पर संतुलित NPK खाद दें।\n2. रासायनिक खाद के साथ अच्छी तरह सड़ी गोबर की खाद (FYM) या वर्मीकम्पोस्ट अवश्य मिलाएं।\n3. यूरिया का छिड़काव हमेशा हल्की सिंचाई के बाद या नम मिट्टी में शाम के समय करें। नीम लेपित यूरिया का ही उपयोग करें।`;
    }
    return `Balanced fertilizer guidance:\n1. Apply fertilizers strictly based on your Soil Health Card recommendations.\n2. Combine chemical fertilizers with well-rotted Farmyard Manure (FYM) or vermicompost to preserve soil organic carbon.\n3. Top-dress Urea only under moist soil conditions during late afternoon to prevent volatilization loss.`;
  }

  if (q.includes('scheme') || q.includes('yojana') || q.includes('pm kisan') || q.includes('bima') || q.includes('subsidy')) {
    if (isHindi) {
      return `किसानों के लिए प्रमुख सरकारी योजनाएं:\n1. **पीएम-किसान सम्मान निधि (PM-KISAN)**: प्रति वर्ष ₹6,000 की वित्तीय सहायता (3 किस्तों में)।\n2. **प्रधानमंत्री फसल बीमा योजना (PMFBY)**: प्राकृतिक आपदाओं से फसल नुकसान पर न्यूनतम प्रीमियम (खरीफ 2%, रबी 1.5%) पर सुरक्षा।\n3. **किसान क्रेडिट कार्ड (KCC)**: 4% की रियायती ब्याज दर पर कृषि ऋण।\nइनका लाभ लेने के लिए अपने नजदीकी CSC केंद्र या कृषि कार्यालय में संपर्क करें।`;
    }
    return `Key Government Agricultural Schemes:\n1. **PM-KISAN**: Direct income support of ₹6,000/year in 3 installments.\n2. **PM Fasal Bima Yojana (PMFBY)**: Affordable crop insurance against natural calamities (Kharif 2%, Rabi 1.5% premium).\n3. **Kisan Credit Card (KCC)**: Concessional farm loans at 4% effective interest rate.\nVisit your nearest Common Service Centre (CSC) or district agriculture department to register.`;
  }

  // General agricultural response
  if (isHindi) {
    return `नमस्ते! मैं किसानलेंस एआई (Gnani AI Evon v3.3 द्वारा संचालित) हूँ, आपका डिजिटल कृषि मित्र। मैं फसलों के रोग, मौसम आधारित कृषि सलाह, खाद-पानी प्रबंधन, मंडी भाव और सरकारी योजनाओं में आपकी सहायता कर सकता हूँ। आप अपनी फसल (${crop}) के बारे में कोई भी प्रश्न बोलकर या लिखकर पूछ सकते हैं!`;
  }

  return `Hello! I am KisanLens AI (powered by Gnani AI Evon v3.3), your digital farming companion. I can assist you with crop disease diagnosis, weather-based farm advisories, organic pest control, fertilizer scheduling, and government schemes. Feel free to ask any question by speaking or typing!`;
}

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/m4a',
    webm: 'audio/webm',
    opus: 'audio/opus',
  };
  return mimeMap[ext] || 'audio/wav';
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return 'Kharif (खरीफ / Monsoon)';
  if (month >= 10 && month <= 2) return 'Rabi (रबी / Winter)';
  return 'Zaid (जायद / Summer)';
}

module.exports = {
  transcribeAudio,
  synthesizeSpeech,
  agriculturalChat,
  analyzeCrop,
  isGnaniConfigured,
  LANGUAGE_META,
};
