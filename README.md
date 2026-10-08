# KisanLens AI 🌾

### AI-Powered Farm Decision Intelligence Platform

> *See Your Farm. Understand Your Crop. Make Better Decisions.*

KisanLens AI is an AI-powered agricultural decision-support platform designed for small and marginal farmers. It combines crop image analysis, weather intelligence, market data, and conversational AI to deliver actionable farming recommendations.

---

## ✨ Features

### 🔬 AI Crop Scanner
Upload or capture crop images for instant AI-powered health analysis using Google Gemini multimodal AI. Receive cautious preliminary assessments with confidence scores, severity levels, and recommended actions.

### 🌦️ Weather Intelligence
Real-time weather data from Open-Meteo API with agricultural context. Automated farm advisories for irrigation, spraying, and field work based on deterministic business rules.

### 💰 Market / Mandi Intelligence
Agricultural commodity prices with trend analysis. Supports live government data API (data.gov.in) with clearly labeled demo fallback data.

### 🧠 Farm Decision Engine
Combines crop health + weather + market data to generate actionable daily farm recommendations. Uses deterministic rules for predictable decisions, AI for explanation only.

### 🤖 AI Farming Assistant
Conversational AI assistant supporting Hindi, English, and Hinglish. Uses farm context (crop, weather, analysis) for personalized responses.

### 🎙️ Voice Input
Browser-native speech-to-text for hands-free interaction (where supported).

### 🌐 Hindi + English
Full bilingual UI with proper translation architecture using locale files.

### 📊 Dashboard
Central farmer dashboard answering: *"What should I know about my farm today?"*

### 📋 Farm History
Persistent crop analysis history with image previews and pagination.

---

## 🏗️ Architecture

```
                    KISANLENS AI
                         │
              ┌──────────┴──────────┐
              │                     │
          React UI              Express API
              │                     │
              │       ┌─────────────┼──────────────┐
              │       │             │              │
              │       ▼             ▼              ▼
              │    Gemini       Open-Meteo     Mandi Data
              │       │             │              │
              │       └─────────────┼──────────────┘
              │                     ▼
              │              FARM DECISION ENGINE
              │                     │
              └─────────────────────┘
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
- Google Gemini API (multimodal)
- Open-Meteo Weather API
- JWT Authentication
- Multer (image uploads)
- Helmet, CORS, Rate Limiting
- Winston (structured logging)

---

## 📁 Project Structure

```
kisanlens-ai/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts (Language, Farm)
│   │   ├── layouts/           # App layout
│   │   ├── locales/           # en.json, hi.json translations
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API service layer
│   │   ├── App.tsx            # Router configuration
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles + Tailwind
│   ├── public/
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # Environment + database config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, upload, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # Express routes
│   │   ├── services/          # Business logic (AI, Weather, Market, Farm)
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
- Google Gemini API key

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
# Edit .env with your API keys
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
| `GEMINI_API_KEY` | Google Gemini API key | Yes (for AI features) |
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

### Crop Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crops/analyze` | Upload & analyze crop image (multipart) |
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

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/message` | Send message to AI |
| DELETE | `/api/assistant/history` | Clear conversation |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/profile` | Get profile |

---

## 🧪 Demo Workflow

1. **Open KisanLens** → Landing page
2. **Select Tomato** → Crop scanner
3. **Upload crop image** → AI analyzes
4. **View results** → Possible issue, confidence, severity
5. **Check Weather** → Live Delhi weather + farm advisory
6. **Generate Farm Actions** → Irrigation, spraying, field work recommendations
7. **View Market** → Tomato prices with trend chart (demo data)
8. **Ask AI Assistant** → "मेरी टमाटर की फसल में पत्ते पीले हो रहे हैं"
9. **View History** → Past crop analyses
10. **Switch to Hindi** → Full UI translation

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
- Centralized error handling (no stack traces in production)

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy dist/ to Vercel
```

### Backend → Render/Railway
```bash
cd server
# Set environment variables
# Start command: npm start
```

### Database → MongoDB Atlas
- Create free M0 cluster
- Whitelist IPs
- Set connection string in MONGODB_URI

---

## ⚠️ Known Limitations

1. **Market data** uses demo/fallback data unless data.gov.in API key is configured
2. **AI analysis** requires Gemini API key to function
3. **Voice input** depends on browser support (Chrome/Edge recommended)
4. **Image storage** uses local filesystem (use Cloudinary for production)
5. **MongoDB** required for history persistence

---

## 🗺️ Future Roadmap

### Phase 2
- Regional languages (Marathi, Tamil, Telugu)
- Government schemes integration
- Agricultural expert network
- SMS/WhatsApp notifications

### Phase 3
- Satellite imagery analysis
- IoT sensor integration
- Soil health monitoring
- Advanced crop prediction

### Phase 4
- Crop insurance integration
- Agricultural marketplace
- Direct farmer-to-buyer platform
- Financial insights

---

## 📄 License

MIT

---

**Built with ❤️ for Indian farmers**
