# KisanLens AI 🌾🎙️👁️

### Multimodal Voice & Vision Farm Intelligence Platform
**Powered by Gnani AI (Prisma STT • Timbre TTS • Evon LLM) & NVIDIA NIM (Nemotron 3.5 Super VL 120B)**

> *See Your Farm. Inspect Your Crop. Speak Your Questions. Make Better Decisions.*

---

## 📖 Overview

**KisanLens AI** is an advanced, voice-first and vision-powered agricultural decision-support platform engineered specifically for Indian farmers. It eliminates literacy and language barriers by marrying state-of-the-art **multimodal computer vision** (real leaf pathology inspection) with **conversational Indic voice AI** (speech-to-text, natural expressive text-to-speech, and agricultural reasoning) across 9+ Indian languages.

Whether a farmer snaps a photo of a diseased leaf while asking a spoken question, checks live Mandi prices, listens to a code-mixed daily farm briefing in Hinglish, dials an offline telephonic IVR helpline, or forecasts harvest yields, KisanLens AI delivers actionable, scientific, and organic agronomic advice in their native tongue.

---

## ✨ Flagship Capabilities

### 👁️ 1. True Multimodal Crop Vision Diagnostics (NVIDIA NIM Nemotron 3.5 Super VL 120B)
- **Genuine Pixel Analysis**: Uploaded crop leaves are directly analyzed by NVIDIA NIM's **Nemotron 3.5 Super VL 120B** vision-language model. The AI inspects actual leaf discolorations, yellowing patterns, lesions, fungal growth, pest bites, and healthy tissue.
- **No Scripted Responses**: Every diagnosis is custom-generated based on the visual evidence in the photo, outputting observations, identified issues, severity ratings, confidence levels, and organic IPM treatments.
- **Multilingual Diagnostics**: Generates complete pathology reports in the farmer's selected native script (Hindi, Punjabi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali, or English).
- **Resilient Fallback Hierarchy**: `NVIDIA NIM Vision` ➔ `Gnani Evon LLM Reasoning` ➔ `ICAR Calibrated Agronomic Heuristics`.

### 🎙️ 2. Multimodal Voice Diagnostics
- **Photo + Voice in One Shot**: Farmers can upload an image and simultaneously hold the mic button to record a question in their mother tongue (e.g., *"मेरी पत्ती पर यह भूरे धब्बे क्यों हैं?"*).
- **Gnani Prisma v2.5 STT**: Transcribes raw speech with Indian dialect and accent tolerance.
- **Combined Intelligence**: The transcribed audio question is merged with the visual diagnosis prompt so the AI directly answers the farmer's specific spoken concern.
- **Instant Spoken Diagnosis**: Pre-synthesized using **Gnani Timbre v2.5 TTS** for seamless one-tap playback.

### 📻 3. Daily Code-Mixed Audio Briefings (*"Kisan Vani"*)
- Personalized daily morning audio digest calibrated to the farmer's specific farm profile (crop, growth stage, soil, and district).
- Combines live localized weather, spray/irrigation windows, and nearby Mandi commodity rates.
- Delivered in natural **Hinglish**, **Hindi**, or **English** with expressive Indic voice synthesis.

### ☎️ 4. Telephonic IVR Helpline Simulator (`1800-889-KISAN`)
- Provides accessibility for farmers with basic feature phones or in low-connectivity areas without smartphones.
- Realistic phone dialer with DTMF key tones and simulated telephone bandpass/noise cancellation.
- Interactive audio menu:
  - **Press 1**: Localized Weather Advisory
  - **Press 2**: Live Mandi Rates
  - **Press 3**: Crop Disease & Organic Remedies
  - **Press 4**: Government Schemes (PM-KISAN, PMFBY, KCC)
  - **Press 0**: Krishi Vigyan Kendra (KVK) Expert Assistance

### 🤖 5. Conversational Indic AI Farming Assistant
- Context-aware chatbot powered by **Gnani Evon v3.3**.
- Complete voice-in, voice-out loop with audio waveform animations, transcription preview banners, and automatic speech playback.
- Adheres to ICAR safety standards: never prescribes lethal/banned chemicals, prioritizing Integrated Pest Management (IPM), bio-control agents (*Trichoderma*, Neem oil), and soil health.

### 📈 6. Machine Learning Crop Yield Predictor
- Data-driven yield forecasting engine trained across 10 major Indian crops ($R^2 = 0.9734$).
- Evaluates rainfall, temperature, soil composition, and acreage to predict output per hectare.

### 🌦️ 7. Weather & Mandi Intelligence
- Real-time weather and 7-day agro-climatic forecasts via Open-Meteo with automated farm action alerts.
- Live commodity market rates via `data.gov.in` with historical trend charts.

---

## 🏗️ Architecture

```
                                      KISANLENS AI
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
             React 19 Client                              Node.js Express API
         (Vite + Tailwind CSS 4)                                  │
                    │                      ┌──────────────────────┼──────────────────────┐
                    │                      ▼                      ▼                      ▼
                    │               Gnani AI Suite            NVIDIA NIM             Open-Meteo &
                    │         ┌────────────┼───────────┐      Nemotron 3.5          data.gov.in
                    │         │            │           │     Super VL 120B                │
                    │       Prisma        Evon      Timbre         │                      │
                    │       v2.5         v3.3       v2.5     (Vision Analysis)        (Weather /
                    │       (STT)        (LLM)      (TTS)          │                    Mandi)
                    │         │            │           │           │                      │
                    │         └────────────┼───────────┘           │                      │
                    │                      │                       │                      │
                    │                      ▼                       ▼                      │
                    │             MULTIMODAL DIAGNOSTIC & DECISION ENGINE ◄───────────────┘
                    │                                      │
                    └──────────────────────────────────────┼──────────────────────────────┘
                                                           ▼
                                                   MongoDB Database
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS 4, Custom Indic Typography & Glassmorphism
- **Routing & State**: React Router v7, React Context (Language & Farm Profiles)
- **Audio & Media**: HTML5 MediaRecorder API, Web Audio API, Browser Speech Synthesis Fallback
- **Icons & Visuals**: Lucide React, Recharts (Mandi Trends), React Hot Toast

### Backend
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Vision AI**: NVIDIA NIM (`nvidia/nemotron-3.5-super-vl-120b-a12b`)
- **Speech AI**: Gnani AI Prisma v2.5 STT, Gnani AI Timbre v2.5 TTS
- **Reasoning AI**: Gnani AI Evon v3.3 Agricultural LLM
- **External APIs**: Open-Meteo, data.gov.in, ImageKit CDN
- **Security & Logging**: Helmet, CORS, Express Rate Limit, Winston Logger, JWT Auth

---

## 📁 Repository Structure

```
kisanlens-ai/
├── client/                           # React 19 Frontend
│   ├── src/
│   │   ├── components/               # Loading skeletons, Briefing cards, Navbars
│   │   ├── contexts/                 # LanguageContext (hi/en), FarmContext
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts   # MediaRecorder voice input handler
│   │   │   └── useAudioPlayer.ts     # Dual-engine audio player with lifecycle guards
│   │   ├── locales/                  # en.json, hi.json translation dictionaries
│   │   ├── pages/
│   │   │   ├── Assistant.tsx         # Voice-first Indic AI agricultural chatbot
│   │   │   ├── CropScanner.tsx       # Multimodal leaf photo + voice recording input
│   │   │   ├── CropAnalysisResult.tsx# Diagnostic report with audio playback
│   │   │   ├── IvrHelpline.tsx       # Interactive 1800-889-KISAN phone simulator
│   │   │   ├── YieldPredictor.tsx    # ML crop yield calculation interface
│   │   │   ├── Weather.tsx           # Agricultural weather & spraying advisories
│   │   │   └── MarketPrices.tsx      # Mandi rates with commodity trend analysis
│   │   └── services/api.ts           # Centralized Axios client & API endpoints
│   └── vite.config.ts
├── server/                           # Express Backend
│   ├── src/
│   │   ├── config/                   # Config loader & database connection
│   │   ├── controllers/
│   │   │   ├── cropController.js     # Multimodal image & voice crop diagnostics
│   │   │   ├── voiceController.js    # Gnani Prisma STT & Timbre TTS routing
│   │   │   ├── briefingController.js # Personalized daily code-mixed audio briefing
│   │   │   ├── ivrController.js      # Telephonic IVR menu handler
│   │   │   ├── yieldController.js    # ML crop yield estimation
│   │   │   └── weatherController.js  # Weather advisory with offline fallbacks
│   │   ├── services/
│   │   │   ├── gnaniService.js       # Gnani AI integration + NVIDIA NIM Vision engine
│   │   │   ├── cropKnowledgeBase.js  # Calibrated 9-language ICAR diagnostic fallback
│   │   │   ├── weatherService.js     # Open-Meteo weather client
│   │   │   └── marketService.js      # Mandi rate client with agro-climatic fallbacks
│   │   ├── models/                   # CropAnalysis, Farm, User Mongoose schemas
│   │   └── index.js                  # Express server bootstrap
│   └── .env.example
├── README.md
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- MongoDB instance (local or Atlas)
- Gnani AI API Key ([Vachana API Portal](https://api.vachana.ai))
- NVIDIA NIM API Key ([NVIDIA Build](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b))

### 1. Clone the Repository
```bash
git clone https://github.com/dhruv-ns/KisanLens-AI.git
cd KisanLens-AI
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
```

Configure your `.env` file:
```properties
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kisanlens

# Gnani AI Stack (STT: Prisma v2.5, TTS: Timbre v2.5, LLM: Evon v3.3)
GNANI_API_KEY=your_gnani_api_key_here
GNANI_EVON_ENDPOINT=https://api.vachana.ai/v1/chat/completions
GNANI_EVON_ENABLED=true

# NVIDIA NIM — Vision-Language Model for Crop Disease Diagnosis
NVIDIA_API_KEY=nvapi-your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_VISION_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b

# Security Secrets
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/crops/analyze` | `POST` | Upload crop leaf image + optional farmer audio note for vision diagnosis |
| `/api/crops/history` | `GET` | Retrieve paginated diagnostic history for the farm |
| `/api/voice/transcribe` | `POST` | Transcribe speech audio using Gnani Prisma v2.5 |
| `/api/voice/synthesize` | `POST` | Synthesize Indic regional speech using Gnani Timbre v2.5 |
| `/api/voice/chat` | `POST` | End-to-end conversational voice loop (Audio In ➔ AI ➔ Audio Out) |
| `/api/briefing/today` | `GET` | Get personalized code-mixed daily farm audio briefing |
| `/api/ivr/call` | `POST` | Process IVR keypad simulation & return audio responses |
| `/api/yield/predict` | `POST` | Predict harvest yield per hectare based on agro-parameters |
| `/api/weather/current` | `GET` | Get localized weather advisory and field condition alerts |
| `/api/market` | `GET` | Query state/district Mandi commodity rates and price trends |

---

## 🛡️ Agronomic Safety & Responsible AI

1. **ICAR & KVK Advisory Standards**: KisanLens AI strictly adheres to safety standards set by the Indian Council of Agricultural Research. It never suggests toxic, banned, or hazardous pesticide dosages.
2. **Organic First (IPM)**: Recommendations prioritize bio-control agents (*Trichoderma viride*, *Pseudomonas fluorescens*), neem formulations (1500 ppm), cultural practices, and balanced NPK fertilizer usage.
3. **Escalation Protocol**: Unclear or severe infestations automatically prompt the farmer to consult their local Krishi Vigyan Kendra (KVK) or Block Agriculture Officer.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Built with pride for Indian Farmers across Bharat.** 🇮🇳
