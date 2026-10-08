import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { marketApi } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

const COMMODITIES = ['Tomato', 'Potato', 'Rice', 'Wheat', 'Onion'];
const STATES = ['Maharashtra', 'Uttar Pradesh', 'Karnataka', 'Punjab', 'Madhya Pradesh', 'West Bengal', 'Haryana'];

export default function Market() {
  const { t, language } = useLanguage();
  const [commodity, setCommodity] = useState('Tomato');
  const [state, setState] = useState('');
  const [trend, setTrend] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('demo');
  const [disclaimer, setDisclaimer] = useState('');

  useEffect(() => {
    fetchTrend();
  }, [commodity, state]);

  const fetchTrend = async () => {
    setLoading(true);
    try {
      const res = await marketApi.getTrend(commodity, state || undefined);
      setTrend(res.trend);
      setSource(res.source);
      setDisclaimer(res.disclaimer || '');
    } catch { setTrend(null); }
    finally { setLoading(false); }
  };

  const trendIcon = trend?.trend === 'up' ? TrendingUp : trend?.trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trend?.trend === 'up' ? 'text-green-600' : trend?.trend === 'down' ? 'text-red-600' : 'text-gray-500';

  const getCropLabel = (crop: string) => {
    const key = `scanner.crops.${crop.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : crop;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('market.title')}</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">{t('market.subtitle')}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {COMMODITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCommodity(c)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
              commodity === c ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-300'
            }`}
          >
            {getCropLabel(c)}
          </button>
        ))}
      </div>

      <div>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
        >
          <option value="">{t('market.selectState')}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Demo Disclaimer */}
      {source === 'demo' && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{disclaimer || t('market.demoDisclaimer')}</span>
        </div>
      )}

      {loading ? <CardSkeleton /> : trend ? (
        <>
          {/* Price Card */}
          <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-[var(--color-text-secondary)]">{getCropLabel(commodity)}</div>
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
                <TrendIcon className={`w-4 h-4 ${trend.trend === 'down' ? 'rotate-180' : ''}`} />
                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
              </span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">₹{trend.latestPrice?.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('market.modalPrice')} · {t('market.perQuintal')}</div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">Min</div>
                <div className="text-sm font-semibold">₹{trend.minPrice?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">Avg</div>
                <div className="text-sm font-semibold">₹{trend.avgPrice?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">Max</div>
                <div className="text-sm font-semibold">₹{trend.maxPrice?.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Price Chart */}
          {trend.recentPrices?.length > 1 && (
            <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
              <h3 className="font-semibold mb-3">{t('market.priceChart')}</h3>
              <div className="h-52 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.recentPrices.map((p: any) => ({
                    date: new Date(p.date).toLocaleDateString(language === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short' }),
                    price: p.price,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, t('market.modalPrice')]}
                    />
                    <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Source Label */}
          <div className="text-center">
            <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
              source === 'api' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {source === 'api' ? '✓ Live Data' : '⚠ Demo Data'}
            </span>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-[var(--color-text-secondary)]">{t('market.noData')}</div>
      )}
    </div>
  );
}
