import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Cloud, Store, MessageCircle, MapPin, Thermometer, Droplets, Wind, AlertTriangle, TrendingUp, Leaf, ArrowRight, Sprout } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { weatherApi, marketApi, farmApi, cropApi } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { farm } = useFarm();
  const [weather, setWeather] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [latestScan, setLatestScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const period = hour < 12 ? t('dashboard.morning') : hour < 17 ? t('dashboard.afternoon') : t('dashboard.evening');
    return `${t('dashboard.greeting')} ${period}! 👋`;
  };

  useEffect(() => {
    loadDashboardData();
  }, [farm]);

  const loadDashboardData = async () => {
    setLoading(true);
    const lat = farm?.latitude || 28.6139;
    const lon = farm?.longitude || 77.209;
    const crop = farm?.crop || 'Tomato';

    try {
      const [weatherRes, adviceRes, marketRes, historyRes] = await Promise.allSettled([
        weatherApi.getCurrent(lat, lon),
        farmApi.getAdvice({ crop, cropStage: farm?.cropStage || '', latitude: lat, longitude: lon }),
        marketApi.getTrend(crop),
        cropApi.getHistory(1, 1),
      ]);

      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value.data);
      if (adviceRes.status === 'fulfilled') setAdvice(adviceRes.value.data);
      if (marketRes.status === 'fulfilled') setMarket(marketRes.value);
      if (historyRes.status === 'fulfilled' && historyRes.value.data?.length) setLatestScan(historyRes.value.data[0]);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (['good', 'normal'].includes(s)) return 'status-good';
    if (['caution', 'monitor', 'info'].includes(s)) return 'status-caution';
    if (['postpone', 'attention', 'recommended'].includes(s)) return 'status-postpone';
    if (['avoid', 'urgent'].includes(s)) return 'status-avoid';
    return 'status-info';
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 md:p-6 text-white">
        <h1 className="text-xl md:text-2xl font-bold mb-1">{getGreeting()}</h1>
        {farm?.crop ? (
          <div className="flex items-center gap-2 text-primary-100 text-sm">
            <Leaf className="w-4 h-4" />
            <span>{farm.farmName || 'My Farm'} • {farm.crop} • {farm.area ? `${farm.area} ${farm.areaUnit || 'acres'}` : ''}</span>
          </div>
        ) : (
          <Link to="/farm" className="text-primary-100 text-sm underline">
            {t('dashboard.noFarm')} →
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3">
        {[
          { to: '/crop-scanner', icon: Camera, label: t('dashboard.scanCrop'), color: 'bg-green-50 text-green-700 border-green-200' },
          { to: '/yield-prediction', icon: Sprout, label: language === 'en' ? 'Predict Yield' : 'पैदावार अनुमान', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { to: '/weather', icon: Cloud, label: t('dashboard.checkWeather'), color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { to: '/market', icon: Store, label: t('dashboard.viewMarket'), color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { to: '/assistant', icon: MessageCircle, label: t('dashboard.askAI'), color: 'bg-purple-50 text-purple-700 border-purple-200' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-xl border ${color} hover:shadow-md transition-all no-underline`}
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-medium text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Weather + Crop Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Card */}
        {loading ? <CardSkeleton /> : weather?.current ? (
          <Link to="/weather" className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-lg transition-shadow no-underline block">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('weather.current')}</h3>
              <Cloud className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)]">{weather.current.temperature}°C</div>
                <div className="text-sm text-[var(--color-text-secondary)]">{weather.current.weatherDescription}</div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div>
                  <Droplets className="w-4 h-4 mx-auto text-blue-500 mb-0.5" />
                  <div className="text-xs font-medium">{weather.current.humidity}%</div>
                </div>
                <div>
                  <Wind className="w-4 h-4 mx-auto text-gray-500 mb-0.5" />
                  <div className="text-xs font-medium">{weather.current.windSpeed}<span className="text-[10px]">km/h</span></div>
                </div>
                <div>
                  <Droplets className="w-4 h-4 mx-auto text-cyan-500 mb-0.5" />
                  <div className="text-xs font-medium">{weather.advisory?.rainProbability || 0}%</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{t('weather.rain')}</div>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)]">{t('weather.unavailable')}</p>
          </div>
        )}

        {/* Latest Crop Scan */}
        {loading ? <CardSkeleton /> : latestScan ? (
          <Link to={`/crop-analysis/${latestScan._id}`} className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-lg transition-shadow no-underline block">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{t('dashboard.recentScan')}</h3>
              <span className={`severity-${latestScan.severity} text-xs font-medium px-2 py-0.5 rounded-full`}>
                {t(`analysis.severityLevels.${latestScan.severity}`)}
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{latestScan.possibleIssue}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">{latestScan.crop} • {t('analysis.confidence')}: {latestScan.confidence}%</div>
          </Link>
        ) : (
          <Link to="/crop-scanner" className="bg-white rounded-2xl p-5 border border-dashed border-primary-300 hover:bg-primary-50 transition-colors flex flex-col items-center justify-center gap-2 no-underline">
            <Camera className="w-8 h-8 text-primary-400" />
            <span className="text-sm font-medium text-primary-600">{t('dashboard.scanCrop')}</span>
          </Link>
        )}
      </div>

      {/* Farm Actions */}
      {advice?.actions?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">{t('dashboard.todaysActions')}</h3>
          <div className="space-y-2">
            {advice.actions.slice(0, 5).map((action: any, i: number) => (
              <div key={i} className={`${statusColor(action.status)} px-3 py-2.5 rounded-xl text-sm flex items-start gap-2`}>
                <span className="text-lg leading-none">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs uppercase tracking-wide">{action.status}</span>
                  <p className="mt-0.5 leading-snug">{action.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Snapshot */}
      {market?.trend && (
        <Link to="/market" className="bg-white rounded-2xl p-5 border border-[var(--color-border)] hover:shadow-lg transition-shadow no-underline block">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[var(--color-text-primary)]">{t('dashboard.marketSnapshot')}</h3>
            <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm text-[var(--color-text-secondary)] mb-0.5">{market.commodity}</div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">₹{market.trend.latestPrice?.toLocaleString()}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{t('market.perQuintal')}</div>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${market.trend.trend === 'up' ? 'text-green-600' : market.trend.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              <TrendingUp className={`w-4 h-4 ${market.trend.trend === 'down' ? 'rotate-180' : ''}`} />
              {market.trend.changePercent > 0 ? '+' : ''}{market.trend.changePercent}%
            </div>
          </div>
          {market.source === 'demo' && (
            <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg inline-block">
              ⚠️ Demo Data
            </div>
          )}
        </Link>
      )}

      {/* AI Assistant Shortcut */}
      <Link
        to="/assistant"
        className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-5 border border-purple-200 hover:shadow-lg transition-shadow flex items-center gap-4 no-underline"
      >
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <MessageCircle className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('dashboard.aiAssistant')}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {language === 'en' ? 'Ask about your crop, weather, or farming tips' : 'अपनी फसल, मौसम या खेती के बारे में पूछें'}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
      </Link>
    </div>
  );
}
