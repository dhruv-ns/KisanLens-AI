import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Camera, History, AlertTriangle, CheckCircle, XCircle, Info, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cropApi } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function CropAnalysisResult() {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useLanguage();
  const [analysis, setAnalysis] = useState<any>(location.state?.analysis || null);
  const [loading, setLoading] = useState(!analysis);

  useEffect(() => {
    if (!analysis && id) {
      cropApi.getAnalysis(id).then((res) => {
        setAnalysis(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;
  if (!analysis) return (
    <div className="text-center py-16">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <p className="text-[var(--color-text-secondary)]">{t('common.error')}</p>
      <Link to="/crop-scanner" className="text-primary-600 font-medium mt-2 inline-block">{t('analysis.newScan')}</Link>
    </div>
  );

  const severityConfig: Record<string, { color: string; icon: any; bg: string }> = {
    healthy: { color: 'text-green-700', icon: CheckCircle, bg: 'bg-green-50 border-green-200' },
    low: { color: 'text-yellow-700', icon: Info, bg: 'bg-yellow-50 border-yellow-200' },
    moderate: { color: 'text-orange-700', icon: AlertTriangle, bg: 'bg-orange-50 border-orange-200' },
    high: { color: 'text-red-700', icon: XCircle, bg: 'bg-red-50 border-red-200' },
    unknown: { color: 'text-gray-700', icon: Info, bg: 'bg-gray-50 border-gray-200' },
  };

  const sev = severityConfig[analysis.severity] || severityConfig.unknown;
  const SevIcon = sev.icon;

  const apiUrl = import.meta.env.VITE_API_URL || '';

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Back Button */}
      <Link to="/crop-scanner" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] no-underline">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('analysis.title')}</h1>

      {/* Image Preview */}
      {analysis.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-gray-50">
          <img src={`${apiUrl}${analysis.imageUrl}`} alt="Analyzed crop" className="w-full max-h-56 object-contain" />
        </div>
      )}

      {/* Severity + Crop + Issue Header */}
      <div className={`rounded-2xl p-5 border ${sev.bg}`}>
        <div className="flex items-start gap-3">
          <SevIcon className={`w-6 h-6 ${sev.color} mt-0.5 shrink-0`} />
          <div className="flex-1">
            <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-0.5">{analysis.crop}</div>
            <h2 className={`text-xl font-bold ${sev.color}`}>{analysis.possibleIssue}</h2>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <span className="text-xs text-[var(--color-text-muted)]">{t('analysis.confidence')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full" style={{ width: `${analysis.confidence}%` }} />
                  </div>
                  <span className="text-sm font-bold">{analysis.confidence}%</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-[var(--color-text-muted)]">{t('analysis.severity')}</span>
                <div className={`severity-${analysis.severity} text-xs font-semibold px-2.5 py-1 rounded-full inline-block mt-0.5`}>
                  {t(`analysis.severityLevels.${analysis.severity}`)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observations */}
      {analysis.observations?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">{t('analysis.observations')}</h3>
          <ul className="space-y-2">
            {analysis.observations.map((obs: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {analysis.recommendedActions?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">{t('analysis.recommendations')}</h3>
          <ul className="space-y-2">
            {analysis.recommendedActions.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                <CheckCircle className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expert Advice */}
      {analysis.expertAttention && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm text-blue-800 mb-0.5">{t('analysis.expertAdvice')}</h4>
            <p className="text-sm text-blue-700">{analysis.expertAttention}</p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">{analysis.disclaimer || t('analysis.disclaimer')}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/crop-scanner" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors no-underline">
          <Camera className="w-4 h-4" /> {t('analysis.newScan')}
        </Link>
        <Link to="/history" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-[var(--color-text-primary)] rounded-xl font-medium border border-[var(--color-border)] hover:bg-gray-50 transition-colors no-underline">
          <History className="w-4 h-4" /> {t('analysis.viewHistory')}
        </Link>
      </div>
    </div>
  );
}
