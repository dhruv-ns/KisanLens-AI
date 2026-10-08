import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, Thermometer, Droplets, Wind, CloudRain, Sun, Cloud as CloudIcon, Umbrella } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { weatherApi } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function Weather() {
  const { t, language } = useLanguage();
  const { farm } = useFarm();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const lat = farm?.latitude || 28.6139;
    const lon = farm?.longitude || 77.209;
    const name = farm?.location?.city || 'Delhi';
    fetchWeather(lat, lon, name);
  }, []);

  const fetchWeather = async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await weatherApi.getCurrent(lat, lon);
      setWeather(res.data);
      if (name) setLocationName(name);
    } catch {
      setError(t('weather.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await weatherApi.searchLocation(searchQuery);
      setSearchResults(res.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [searchQuery]);

  const selectLocation = (loc: any) => {
    setSearchResults([]);
    setSearchQuery('');
    setLocationName(`${loc.name}, ${loc.state || loc.country}`);
    fetchWeather(loc.latitude, loc.longitude, loc.name);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, language === 'en' ? 'Current Location' : 'वर्तमान स्थान'),
      () => setError(language === 'en' ? 'Location access denied.' : 'स्थान अनुमति अस्वीकृत।')
    );
  };

  const getWeatherIcon = (code: number) => {
    if (code <= 1) return <Sun className="w-8 h-8 text-amber-500" />;
    if (code <= 3) return <CloudIcon className="w-8 h-8 text-gray-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code >= 80) return <Umbrella className="w-8 h-8 text-blue-600" />;
    return <CloudIcon className="w-8 h-8 text-gray-400" />;
  };

  const hourlyData = weather?.hourly?.time?.slice(0, 24).map((_: string, i: number) => ({
    time: new Date(weather.hourly.time[i]).getHours() + ':00',
    temp: weather.hourly.temperature[i],
    rain: weather.hourly.precipitationProbability[i],
    humidity: weather.hourly.humidity[i],
  })) || [];

  const dailyData = weather?.daily?.time?.map((_: string, i: number) => ({
    day: new Date(weather.daily.time[i]).toLocaleDateString(language === 'en' ? 'en-IN' : 'hi-IN', { weekday: 'short' }),
    max: weather.daily.temperatureMax[i],
    min: weather.daily.temperatureMin[i],
    rain: weather.daily.precipitationProbabilityMax[i],
    precip: weather.daily.precipitationSum[i],
    code: weather.daily.weatherCode[i],
  })) || [];

  const statusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (['good', 'normal'].includes(s)) return 'status-good';
    if (['caution', 'monitor', 'info'].includes(s)) return 'status-caution';
    if (['postpone', 'attention', 'recommended'].includes(s)) return 'status-postpone';
    if (['avoid', 'urgent'].includes(s)) return 'status-avoid';
    return 'status-info';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('weather.title')}</h1>

      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('weather.searchLocation')}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 cursor-pointer border-none">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
          <button onClick={useMyLocation} className="px-3 py-2.5 bg-white rounded-xl text-sm border border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" title={t('weather.useMyLocation')}>
            <MapPin className="w-4 h-4 text-primary-600" />
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-[var(--color-border)] shadow-xl overflow-hidden">
            {searchResults.map((loc, i) => (
              <button key={i} onClick={() => selectLocation(loc)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-none cursor-pointer bg-transparent">
                <span className="font-medium">{loc.name}</span>
                <span className="text-[var(--color-text-muted)]"> · {loc.state || ''} {loc.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}

      {loading ? <><CardSkeleton /><CardSkeleton /></> : weather ? (
        <>
          {/* Current Weather */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-1 text-blue-100 text-sm mb-3">
              <MapPin className="w-4 h-4" /> {locationName}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl font-bold">{weather.current.temperature}°</div>
                <div className="text-blue-100 text-sm mt-1">{t('weather.feelsLike')} {weather.current.feelsLike}°</div>
                <div className="text-white/80 text-sm">{weather.current.weatherDescription}</div>
              </div>
              <div className="text-right space-y-2">
                {getWeatherIcon(weather.current.weatherCode)}
                <div className="flex items-center gap-1 text-sm"><Droplets className="w-3.5 h-3.5" /> {weather.current.humidity}%</div>
                <div className="flex items-center gap-1 text-sm"><Wind className="w-3.5 h-3.5" /> {weather.current.windSpeed} km/h</div>
              </div>
            </div>
          </div>

          {/* Farm Advisory */}
          {weather.advisory?.advisories?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <h3 className="font-semibold mb-3">{t('weather.farmAdvisory')}</h3>
              <div className="space-y-2">
                {weather.advisory.advisories.map((adv: any, i: number) => (
                  <div key={i} className={`${statusColor(adv.status)} px-3 py-2.5 rounded-xl text-sm flex items-start gap-2`}>
                    <span className="text-lg leading-none">{adv.icon}</span>
                    <div>
                      <span className="font-semibold text-xs uppercase tracking-wide">{adv.status}</span>
                      <p className="mt-0.5 leading-snug">{adv.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly Chart */}
          {hourlyData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <h3 className="font-semibold mb-3">{t('weather.hourly')}</h3>
              <div className="h-52 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp °C" />
                    <Line type="monotone" dataKey="rain" stroke="#3b82f6" strokeWidth={2} dot={false} name="Rain %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 7-Day Forecast */}
          {dailyData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <h3 className="font-semibold mb-3">{t('weather.daily')}</h3>
              <div className="space-y-2">
                {dailyData.map((day: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-none">
                    <span className="w-10 text-sm font-medium text-[var(--color-text-secondary)]">{day.day}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Droplets className="w-3 h-3" /> {day.rain}%
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-blue-600">{day.min}°</span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-amber-400 rounded-full" style={{ width: `${((day.max - day.min) / 50) * 100}%`, marginLeft: `${(day.min / 50) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-amber-600">{day.max}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
