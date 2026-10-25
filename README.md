# KisanLens AI 🌾🎙️

### Voice-First AI-Powered Farm Intelligence Platform (100% Powered by Gnani AI)

> *See Your Farm. Understand Your Crop. Speak Your Questions. Make Better Decisions.*

KisanLens AI is a **voice-first**, AI-powered agricultural decision-support platform designed for small and marginal farmers in India. It combines crop health diagnosis, weather intelligence, market data, and **Gnani AI's conversational intelligence (Prisma v2.5 STT, Timbre v2.5 TTS, and Evon v3.3 LLM)** to deliver actionable farming recommendations in the farmer's own language (Hindi, Hinglish, English, and regional Indian languages).

---

## ✨ Features

### 🔬 AI Crop Scanner (Powered by Gnani AI)
Upload or capture crop images for instant AI-powered health analysis using Gnani AI (Evon v3.3) and ICAR-calibrated agronomic heuristics. Receive cautious preliminary assessments with confidence scores, severity levels, observations, and organic/IPM recommended actions.

### 🌦️ Weather Intelligence
Real-time weather data from Open-Meteo API with agricultural context. Automated farm advisories for irrigation, spraying, and field work based on deterministic business rules.

### 💰 Market / Mandi Intelligence
Agricultural commodity prices with trend analysis. Supports live government data API (data.gov.in) with clearly labeled demo fallback data.

### 🧠 Farm Decision Engine
Combines crop health + weather + market data to generate actionable daily farm recommendations. Uses deterministic rules for predictable decisions, AI for explanation only.

### 🤖 AI Farming Assistant (Voice-First with Gnani AI)
Conversational AI assistant supporting Hindi, English, and Hinglish powered by **Gnani AI Evon v3.3**. Uses farm context (crop, weather, analysis) for personalized responses. Features:
- **Voice recording** with visual feedback and 60-second limit
- **Transcription preview** banner showing what the farmer said via **Gnani Prisma v2.5**
- **Audio response playback** synthesized via **Gnani Timbre v2.5**
- **Auto-play mode** for hands-free conversation flow

### 🎙️ Complete Gnani AI Stack Integration
- **Prisma v2.5 STT** — Server-side speech-to-text supporting Indian languages + code-switching (Hinglish)
- **Timbre v2.5 TTS** — Natural-sounding text-to-speech with expressive Indian voice profiles (e.g. Nalini, Yashvi)
- **Evon v3.3 LLM** — Indic agricultural reasoning and crop disease diagnosis
- **Browser Fallback** — Degrades gracefully to Web Speech API when network is unavailable

### 🌐 Hindi + English (Bilingual)
Full bilingual UI with proper translation architecture using locale files. Voice support for both Hindi and English.

### 📊 Dashboard
Central farmer dashboard answering: *"What should I know about my farm today?"*

### 📋 Farm History
Persistent crop analysis history with image previews and pagination.

---

## 🏗️ Architecture

```
                       KISANLENS AI (100% Gnani AI)
                                    │
                     ┌──────────────┴───────────────┐
                     │                               │
                React UI                       Express API
              (Voice-First)                        │
                     │               ┌──────────────┼───────────────┐
                     │               │              │               │
                     │               ▼              ▼               ▼
                     │         Gnani AI        Open-Meteo       Mandi Data
                     │      ┌────────┼────────┐     │               │
                     │      │        │        │     │               │
                     │    Prisma   Evon    Timbre   │               │
                     │    (STT)    (LLM)   (TTS)    │               │
                     │      │        │        │     │               │
                     │      └────────┼────────┘     │               │
                     │               │              │               │
                     │               ▼              ▼               ▼
                     │       FARM DECISION & DIAGNOSTIC ENGINE
                     │                      │
                     └──────────────────────┴───────────────────────┘
                                            │
                                         MongoDB
```

---

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router
- Recharts
- Lucide React
- React Hot Toast
- Axios

### Backend
- Node.js + Express
- MongoDB + Mongoose
- **Gnani AI Prisma v2.5** (Speech-to-Text)
- **Gnani AI Timbre v2.5** (Text-to-Speech)
- **Gnani AI Evon v3.3** (Agricultural LLM & Crop Diagnostics)
- Open-Meteo Weather API
- JWT Authentication
- Multer (image + audio uploads)
- Helmet, CORS, Rate Limiting
- Winston (structured logging)

---

## 📁 Project Structure

```
kisanlens-ai/
├── client/                    # React Frontend (Voice-First)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts (Language, Farm)
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useVoiceRecorder.ts   # MediaRecorder audio capture
│   │   │   └── useAudioPlayer.ts     # Audio playback + browser TTS
│   │   ├── layouts/           # App layout
│   │   ├── locales/           # en.json, hi.json translations
│   │   ├── pages/             # Route pages (voice-first Assistant)
│   │   ├── services/          # API service layer (+ voice API)
│   │   ├── App.tsx            # Router configuration
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles + voice animations
│   ├── public/
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # Environment + database config
│   │   ├── controllers/       # Route handlers
│   │   │   ├── voiceController.js    # Voice pipeline controller (Gnani AI)
│   │   │   ├── cropController.js     # Crop diagnosis controller (Gnani AI)
│   │   │   ├── assistantController.js# Assistant controller (Gnani AI)
│   │   │   └── ...                   # Other controllers
│   │   ├── middleware/        # Auth, upload, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # Express routes
│   │   │   ├── voiceRoutes.js        # Voice API routes
│   │   │   └── ...                   # Other routes
│   │   ├── services/          # Business logic
│   │   │   ├── gnaniService.js       # Gnani AI (STT + TTS + LLM + Diagnosis)
│   │   │   └── ...                   # Other services
│   │   ├── utils/             # Logger
│   │   └── index.js           # Server entry point
│   └── .env.example
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Gnani AI API key (`GNANI_API_KEY`)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd kisanlens-ai
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Gnani AI API key
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

### 4. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/health

---

## 🔑 Environment Variables

### Server (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `GNANI_API_KEY` | Gnani AI API key (STT + TTS + LLM) | Yes (for AI features) |
| `GNANI_EVON_ENDPOINT` | Evon v3.3 LLM endpoint | No (default: https://api.vachana.ai/v1/chat/completions) |
| `GNANI_EVON_ENABLED` | Enable Evon LLM (`true`/`false`) | No (default: `true`) |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Yes |
| `CLIENT_URL` | Frontend URL for CORS | Yes |
| `MARKET_API_KEY` | data.gov.in API key | No (uses demo data) |

### Client (.env)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (empty for proxy in dev) |

---

## 📡 API Documentation

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

### Voice (Gnani AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/transcribe` | Upload audio → get transcript (Prisma v2.5 STT) |
| POST | `/api/voice/synthesize` | Send text → get audio (Timbre v2.5 TTS) |
| POST | `/api/voice/chat` | Full pipeline: audio/text → AI response + audio |
| GET | `/api/voice/status` | Voice service availability & supported languages |

### AI Assistant (Gnani Evon v3.3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/message` | Send message to Gnani AI |
| DELETE | `/api/assistant/history` | Clear conversation |

### Crop Analysis (Gnani AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crops/analyze` | Upload & diagnose crop issue (multipart) |
| GET | `/api/crops/history` | Get analysis history (paginated) |
| GET | `/api/crops/:id` | Get specific analysis |

### Weather
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather/current?lat=&lon=` | Current weather + advisory |
| GET | `/api/weather/forecast?lat=&lon=` | Forecast data |
| GET | `/api/weather/location?q=` | Geocode search |

### Market
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market?commodity=&state=` | Market data |
| GET | `/api/market/trend?commodity=` | Price trend |
| GET | `/api/market/options` | Available commodities/states |

### Farm
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farm` | Get farm profile |
| POST | `/api/farm` | Create farm profile |
| PUT | `/api/farm` | Update farm profile |
| POST | `/api/farm/advice` | Get farm action recommendations |

---

## 🧪 Demo Workflow (Voice Demo)

1. **Open KisanLens** → Landing page
2. **Navigate to AI Assistant** → Voice-first interface
3. **Tap the green mic button** → Recording starts with visual pulse
4. **Speak in Hindi** → "मेरी टमाटर की फसल में पत्ते पीले हो रहे हैं"
5. **See transcription preview** → Green banner shows what you said (Gnani Prisma v2.5)
6. **AI responds in Hindi** → Text appears (Gnani Evon v3.3) + audio auto-plays (Gnani Timbre v2.5)
7. **Tap 'सुनें' on any message** → Replay the AI response audio
8. **Check Weather** → Live weather + farm advisory
9. **Scan Crop** → Upload crop image for Gnani AI diagnostic assessment
10. **View Market** → Commodity prices with trend chart
11. **Toggle language** → Switch between Hindi ↔ English UI

---

## 🔒 Security

- Helmet security headers
- CORS configuration
- Rate limiting (100/15min general, 20/15min AI endpoints)
- File upload validation (type, size, MIME)
- Safe filename generation (UUID)
- JWT access + refresh tokens
- bcrypt password hashing
- No secrets in frontend code
- Centralized error handling

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy dist/ to Vercel
```

### Backend → Render
```bash
cd server
# Set environment variables:
# GNANI_API_KEY=your_key
# GNANI_EVON_ENABLED=true
# Start command: npm start
```

---

## 📄 License

MIT

---

**Built with ❤️ for Indian farmers using Gnani AI**
