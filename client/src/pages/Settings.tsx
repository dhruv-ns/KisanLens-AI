import React from 'react';
import { Globe, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('nav.settings')}</h1>

      {/* Language */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{language === 'en' ? 'Language' : 'भाषा'}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all cursor-pointer border ${
              language === 'en' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)]'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all cursor-pointer border ${
              language === 'hi' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)]'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">{language === 'en' ? 'About' : 'जानकारी'}</h3>
        </div>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p><strong>KisanLens AI</strong> v1.0.0</p>
          <p>{language === 'en'
            ? 'AI-Powered Intelligence for Smarter Farming. Combining crop health analysis, weather intelligence, market insights, and AI assistance to help farmers make better decisions.'
            : 'स्मार्ट खेती के लिए AI-संचालित बुद्धिमत्ता। फसल स्वास्थ्य विश्लेषण, मौसम बुद्धिमत्ता, बाज़ार अंतर्दृष्टि, और AI सहायता का संयोजन किसानों को बेहतर निर्णय लेने में मदद करता है।'
          }</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            {language === 'en'
              ? 'AI analysis provides preliminary assessments only. Always consult agricultural experts for important decisions.'
              : 'AI विश्लेषण केवल प्रारंभिक मूल्यांकन प्रदान करता है। महत्वपूर्ण निर्णयों के लिए हमेशा कृषि विशेषज्ञों से परामर्श करें।'}
          </p>
        </div>
      </div>
    </div>
  );
}
