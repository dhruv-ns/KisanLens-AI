import React, { useState, useEffect } from 'react';
import {
  Sprout,
  CloudRain,
  Thermometer,
  Layers,
  Sparkles,
  TrendingUp,
  BarChart3,
  Award,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sliders,
  MapPin,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { yieldApi, weatherApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function YieldPrediction() {
  const { language } = useLanguage();
  const { farm } = useFarm();

  const [metadata, setMetadata] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form inputs
  const [crop, setCrop] = useState('Wheat');
  const [country, setCountry] = useState('India');
  const [rainfall, setRainfall] = useState<number>(1050);
  const [temperature, setTemperature] = useState<number>(24.5);
  const [pesticides, setPesticides] = useState<number>(45000);
  const [farmArea, setFarmArea] = useState<number>(farm?.area || 2.5);

  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (metadata && !prediction) {
      handlePredict();
    }
  }, [metadata]);

  const loadMetadata = async () => {
    try {
      setLoadingMeta(true);
      const res = await yieldApi.getMetadata();
      if (res.success && res.data) {
        setMetadata(res.data);
        if (res.data.crops?.length > 0) {
          // If farm has a crop that matches, select it
          const matching = res.data.crops.find(
            (c: string) => c.toLowerCase() === (farm?.crop || '').toLowerCase()
          );
          if (matching) setCrop(matching);
          else if (res.data.crops.includes('Wheat')) setCrop('Wheat');
          else setCrop(res.data.crops[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load yield metadata:', err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const handlePredict = async () => {
    try {
      setPredicting(true);
      const res = await yieldApi.predict({
        crop,
        country,
        rainfall: Number(rainfall),
        temperature: Number(temperature),
        pesticides: Number(pesticides),
        farmArea: Number(farmArea),
      });

      if (res.success) {
        setPrediction(res.data);
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setPredicting(false);
    }
  };

  const loadAlternativeCrops = async () => {
    try {
      setLoadingRecs(true);
      const res = await yieldApi.getRecommendations({
        country,
        rainfall: Number(rainfall),
        temperature: Number(temperature),
        farmArea: Number(farmArea),
      });
      if (res.success) {
        setRecommendations(res.data);
      }
    } catch (err) {
      console.error('Failed to load crop recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleAutoFillWeather = async () => {
    const lat = farm?.latitude || 28.6139;
    const lon = farm?.longitude || 77.209;
    try {
      setFetchingWeather(true);
      const res = await weatherApi.getCurrent(lat, lon);
      if (res.data?.current) {
        setTemperature(Math.round(res.data.current.temperature * 10) / 10);
        // Estimate seasonal rainfall based on local climate or humidity
        const estRain = Math.max(400, Math.min(2200, Math.round(res.data.current.humidity * 16)));
        setRainfall(estRain);
      }
    } catch (err) {
      console.error('Failed to fetch weather for autofill:', err);
    } finally {
      setFetchingWeather(false);
    }
  };

  const ratingBadgeColor = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Above Average':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Average':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Below Average':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                {language === 'en' ? 'AI Crop Yield Intelligence' : 'AI फसल पैदावार अनुमान'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-200 border border-emerald-400/30">
                28,242 Records Trained
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-200 border border-emerald-400/30">
                R² = 0.973 (97.3% Accuracy)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {language === 'en' ? 'Crop Yield Prediction & Harvest Forecasting' : 'फसल पैदावार एवं कटाई उत्पादन पूर्वानुमान'}
            </h1>
            <p className="text-emerald-100 text-sm md:text-base mt-1.5 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Predict your expected agricultural output based on crop variety, annual rainfall, seasonal temperatures, and farm size using machine learning models trained on decades of global harvest data.'
                : 'दशकों के वैश्विक कृषि आंकड़ों पर प्रशिक्षित मशीन लर्निंग मॉडल का उपयोग करके फसल किस्म, वर्षा, तापमान और खेत के आकार के आधार पर पैदावार का सटीक अनुमान लगाएं।'}
            </p>
          </div>

          <button
            onClick={handleAutoFillWeather}
            disabled={fetchingWeather}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-semibold text-sm shadow hover:bg-emerald-50 transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingWeather ? 'animate-spin' : ''}`} />
            {fetchingWeather
              ? language === 'en' ? 'Fetching...' : 'ला रहे हैं...'
              : language === 'en' ? 'Sync Live Weather' : 'लाइव मौसम सिंक करें'}
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Prediction Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[var(--color-border)] shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              {language === 'en' ? 'Harvest Parameters' : 'खेत एवं मौसम पैरामीटर'}
            </h2>
            <span className="text-xs text-gray-500 font-medium">FAO + Kaggle Dataset</span>
          </div>

          {loadingMeta ? (
            <CardSkeleton />
          ) : (
            <div className="space-y-4">
              {/* Crop Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Select Crop' : 'फसल चुनें'}
                </label>
                <div className="relative">
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  >
                    {metadata?.crops?.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Country Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Country / Region' : 'देश / क्षेत्र'}
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                >
                  {metadata?.countries?.map((co: string) => (
                    <option key={co} value={co}>
                      {co}
                    </option>
                  ))}
                </select>
              </div>

              {/* Farm Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'en' ? 'Farm Area (Acres)' : 'खेत का क्षेत्रफल (एकड़)'}
                  </label>
                  <span className="text-sm font-bold text-emerald-700">{farmArea} acres</span>
                </div>
                <input
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.5"
                  value={farmArea}
                  onChange={(e) => setFarmArea(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Annual Rainfall Slider */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-blue-500" />
                    {language === 'en' ? 'Annual Rainfall' : 'वार्षिक वर्षा'}
                  </span>
                  <span className="text-sm font-extrabold text-blue-700">{rainfall} mm</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3500"
                  step="25"
                  value={rainfall}
                  onChange={(e) => setRainfall(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-emerald-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Dry (200 mm)</span>
                  <span>Moderate (1200 mm)</span>
                  <span>Tropical (3500 mm)</span>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    {language === 'en' ? 'Average Temperature' : 'औसत तापमान'}
                  </span>
                  <span className="text-sm font-extrabold text-amber-700">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="42"
                  step="0.5"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-amber-600 h-2 bg-amber-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>5°C</span>
                  <span>24°C</span>
                  <span>42°C</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePredict}
                disabled={predicting}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {language === 'en' ? 'Calculating Harvest Output...' : 'अनुमान लगाया जा रहा है...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {language === 'en' ? 'Predict Crop Yield' : 'पैदावार का अनुमान लगाएं'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Prediction Results Display on Right */}
        <div className="lg:col-span-7 space-y-6">
          {predicting ? (
            <div className="bg-white rounded-3xl p-8 border border-[var(--color-border)] shadow-sm space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : prediction ? (
            <>
              {/* Primary Key Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Quintals Per Acre */}
                <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Yield / Acre' : 'प्रति एकड़ पैदावार'}
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {prediction.quintals_per_acre}
                  </div>
                  <div className="text-[11px] font-medium text-gray-600">
                    {language === 'en' ? 'Quintals / Acre' : 'क्विंटल / एकड़'}
                  </div>
                </div>

                {/* Total Expected Harvest */}
                <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Total Harvest' : 'कुल संभावित उपज'}
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    {prediction.total_production_quintals}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-600">
                    {prediction.total_production_tonnes} {language === 'en' ? 'Tonnes' : 'टन'} ({farmArea} {language === 'en' ? 'acres' : 'एकड़'})
                  </div>
                </div>

                {/* Yield Per Hectare */}
                <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Yield / Hectare' : 'प्रति हेक्टेयर'}
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {prediction.tonnes_per_ha}
                  </div>
                  <div className="text-[11px] font-medium text-gray-600">
                    {prediction.kg_per_ha?.toLocaleString()} kg/ha
                  </div>
                </div>

                {/* Benchmark Rating */}
                <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Performance' : 'प्रदर्शन स्तर'}
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${ratingBadgeColor(
                        prediction.rating
                      )}`}
                    >
                      {prediction.rating}
                    </span>
                    <div className="text-[11px] text-gray-500 mt-1 font-semibold">
                      {prediction.benchmark_comparison?.diff_percent > 0 ? '+' : ''}
                      {prediction.benchmark_comparison?.diff_percent}% vs avg
                    </div>
                  </div>
                </div>
              </div>

              {/* Environmental Feasibility Breakdown */}
              <div className="bg-white rounded-3xl p-6 border border-[var(--color-border)] shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  {language === 'en' ? 'Environmental Suitability Diagnostic' : 'पर्यावरणीय अनुकूलता विश्लेषण'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Temperature Diagnostic */}
                  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Thermometer className="w-4 h-4 text-amber-500" />
                        {language === 'en' ? 'Temperature Status' : 'तापमान स्थिति'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          prediction.environmental_assessment?.temperature?.status === 'Optimal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {prediction.environmental_assessment?.temperature?.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {prediction.environmental_assessment?.temperature?.analysis}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium pt-1">
                      Ideal envelope: {prediction.environmental_assessment?.temperature?.ideal_range}
                    </div>
                  </div>

                  {/* Rainfall Diagnostic */}
                  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <CloudRain className="w-4 h-4 text-blue-500" />
                        {language === 'en' ? 'Rainfall Status' : 'वर्षा स्थिति'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          prediction.environmental_assessment?.rainfall?.status === 'Optimal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {prediction.environmental_assessment?.rainfall?.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {prediction.environmental_assessment?.rainfall?.analysis}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium pt-1">
                      Ideal envelope: {prediction.environmental_assessment?.rainfall?.ideal_range}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Trend Chart (From 28,000+ Kaggle Records) */}
              {prediction.historical_trend?.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-[var(--color-border)] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        {language === 'en'
                          ? `Historical Yield Trajectory: ${crop} (1990 - 2013)`
                          : `ऐतिहासिक पैदावार रुझान: ${crop} (1990 - 2013)`}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {language === 'en'
                          ? 'Empirical average yields recorded in the Kaggle dataset over 24 years'
                          : 'कैलेंडर वर्षों में दर्ज वास्तविक औसत पैदावार (हेक्टोग्राम/हेक्टेयर)'}
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prediction.historical_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            `${Number(value).toLocaleString()} hg/ha (~${Math.round(
                              Number(value) * 0.000404686 * 10
                            ) / 10} qtl/acre)`,
                            'Yield',
                          ]}
                          labelFormatter={(year) => `Year ${year}`}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="avg_yield_hg_ha"
                          name="Avg Yield (hg/ha)"
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ fill: '#059669', r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Crop Recommendation Comparison */}
              <div className="bg-white rounded-3xl p-6 border border-[var(--color-border)] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-600" />
                      {language === 'en'
                        ? 'Alternative Crops Performance Under This Climate'
                        : 'वर्तमान जलवायु में अन्य फसलों का संभावित प्रदर्शन'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {language === 'en'
                        ? `How would other crops perform at ${rainfall}mm rainfall & ${temperature}°C?`
                        : `यदि इसी ${rainfall}mm वर्षा और ${temperature}°C तापमान में अन्य फसलें उगाई जाएं तो क्या परिणाम रहेगा?`}
                    </p>
                  </div>

                  <button
                    onClick={loadAlternativeCrops}
                    disabled={loadingRecs}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
                    {loadingRecs
                      ? language === 'en' ? 'Evaluating...' : 'जाँच रहे हैं...'
                      : language === 'en' ? 'Compare Crops' : 'फसलों की तुलना करें'}
                  </button>
                </div>

                {recommendations.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                          <th className="py-2.5 font-bold">Crop</th>
                          <th className="py-2.5 font-bold">Predicted Yield</th>
                          <th className="py-2.5 font-bold">Total Harvest ({farmArea} ac)</th>
                          <th className="py-2.5 font-bold">Rating</th>
                          <th className="py-2.5 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recommendations.map((rec, i) => (
                          <tr
                            key={rec.crop}
                            className={`hover:bg-gray-50/80 transition-colors ${
                              rec.crop === crop ? 'bg-emerald-50/50 font-semibold' : ''
                            }`}
                          >
                            <td className="py-2.5 flex items-center gap-2 font-medium text-gray-900">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                {i + 1}
                              </span>
                              {rec.crop}
                              {rec.crop === crop && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">
                                  Current
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-gray-800">
                              <span className="font-bold text-emerald-700">
                                {rec.quintals_per_acre}
                              </span>{' '}
                              qtl/acre
                            </td>
                            <td className="py-2.5 text-gray-700">
                              {rec.total_production_quintals} qtl
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ratingBadgeColor(
                                  rec.rating
                                )}`}
                              >
                                {rec.rating}
                              </span>
                            </td>
                            <td className="py-2.5">
                              {rec.crop !== crop && (
                                <button
                                  onClick={() => {
                                    setCrop(rec.crop);
                                    handlePredict();
                                  }}
                                  className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] underline cursor-pointer"
                                >
                                  Select & Predict
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[var(--color-border)] shadow-sm space-y-3">
              <Sprout className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-800">Ready to Predict Harvest</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Adjust parameters on the left and click "Predict Crop Yield" to run the machine learning model.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
