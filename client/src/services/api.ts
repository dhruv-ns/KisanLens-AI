import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kisanlens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kisanlens_token');
    }
    return Promise.reject(error);
  }
);

// ====== CROP API ======
export const cropApi = {
  analyze: async (formData: FormData) => {
    const res = await api.post('/crops/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return res.data;
  },
  getHistory: async (page = 1, limit = 10) => {
    const res = await api.get(`/crops/history?page=${page}&limit=${limit}`);
    return res.data;
  },
  getAnalysis: async (id: string) => {
    const res = await api.get(`/crops/${id}`);
    return res.data;
  },
};

// ====== WEATHER API ======
export const weatherApi = {
  getCurrent: async (lat: number, lon: number) => {
    const res = await api.get(`/weather/current?lat=${lat}&lon=${lon}`);
    return res.data;
  },
  getForecast: async (lat: number, lon: number) => {
    const res = await api.get(`/weather/forecast?lat=${lat}&lon=${lon}`);
    return res.data;
  },
  searchLocation: async (query: string) => {
    const res = await api.get(`/weather/location?q=${encodeURIComponent(query)}`);
    return res.data;
  },
};

// ====== MARKET API ======
export const marketApi = {
  getData: async (commodity?: string, state?: string, district?: string) => {
    const params = new URLSearchParams();
    if (commodity) params.set('commodity', commodity);
    if (state) params.set('state', state);
    if (district) params.set('district', district);
    const res = await api.get(`/market?${params}`);
    return res.data;
  },
  getTrend: async (commodity: string, state?: string) => {
    const params = new URLSearchParams({ commodity });
    if (state) params.set('state', state);
    const res = await api.get(`/market/trend?${params}`);
    return res.data;
  },
  getOptions: async (state?: string) => {
    const params = state ? `?state=${encodeURIComponent(state)}` : '';
    const res = await api.get(`/market/options${params}`);
    return res.data;
  },
};

// ====== FARM API ======
export const farmApi = {
  get: async () => {
    const res = await api.get('/farm');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/farm', data);
    return res.data;
  },
  update: async (data: any) => {
    const res = await api.put('/farm', data);
    return res.data;
  },
  getAdvice: async (data: any) => {
    const res = await api.post('/farm/advice', data);
    return res.data;
  },
};

// ====== ASSISTANT API ======
export const assistantApi = {
  sendMessage: async (message: string, sessionId?: string, context?: any) => {
    const res = await api.post('/assistant/message', { message, sessionId, context });
    return res.data;
  },
  clearHistory: async (sessionId: string) => {
    const res = await api.delete('/assistant/history', { data: { sessionId } });
    return res.data;
  },
};

// ====== AUTH API ======
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data;
  },
};

// ====== CROP YIELD PREDICTION API ======
export const yieldApi = {
  getMetadata: async () => {
    const res = await api.get('/yield/metadata');
    return res.data;
  },
  predict: async (data: {
    crop: string;
    country?: string;
    rainfall: number;
    temperature: number;
    pesticides?: number;
    farmArea?: number;
  }) => {
    const res = await api.post('/yield/predict', data);
    return res.data;
  },
  getRecommendations: async (params: {
    country?: string;
    rainfall: number;
    temperature: number;
    farmArea?: number;
  }) => {
    const query = new URLSearchParams({
      country: params.country || 'India',
      rainfall: params.rainfall.toString(),
      temperature: params.temperature.toString(),
      farmArea: (params.farmArea || 1).toString(),
    });
    const res = await api.get(`/yield/recommendations?${query}`);
    return res.data;
  },
  getCropTrend: async (crop: string) => {
    const res = await api.get(`/yield/trend/${encodeURIComponent(crop)}`);
    return res.data;
  },
};

export default api;
