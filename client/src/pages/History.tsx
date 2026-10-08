import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Calendar, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cropApi } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function History() {
  const { t, language } = useLanguage();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => { fetchHistory(); }, [page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await cropApi.getHistory(page, 10);
      setAnalyses(res.data || []);
      setPagination(res.pagination);
    } catch { setAnalyses([]); }
    finally { setLoading(false); }
  };

  const apiUrl = import.meta.env.VITE_API_URL || '';

  if (loading) return <div className="space-y-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('history.title')}</h1>

      {analyses.length === 0 ? (
        <div className="text-center py-16">
          <Camera className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-[var(--color-text-secondary)] mb-4">{t('history.empty')}</p>
          <Link to="/crop-scanner" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 no-underline">
            <Camera className="w-4 h-4" /> {t('history.scanNow')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <Link
              key={a._id}
              to={`/crop-analysis/${a._id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[var(--color-border)] hover:shadow-lg transition-shadow no-underline"
            >
              {a.imageUrl && (
                <img src={`${apiUrl}${a.imageUrl}`} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{a.possibleIssue}</span>
                  <span className={`severity-${a.severity} text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0`}>
                    {t(`analysis.severityLevels.${a.severity}`)}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {a.crop} · {t('analysis.confidence')}: {a.confidence}%
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.createdAt).toLocaleDateString(language === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            </Link>
          ))}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-40 cursor-pointer bg-white hover:bg-gray-50"
              >
                ←
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">{page} / {pagination.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-40 cursor-pointer bg-white hover:bg-gray-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
