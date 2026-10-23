import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: t('nav.home') },
    { path: '/crop-scanner', label: t('nav.crop') },
    { path: '/yield-prediction', label: t('nav.yield') },
    { path: '/weather', label: t('nav.weather') },
    { path: '/market', label: t('nav.market') },
    { path: '/assistant', label: t('nav.assistant') },
    { path: '/history', label: t('nav.history') },
    { path: '/farm', label: t('nav.farm') },
  ];

  return (
    <nav className="bg-white border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary-800 no-underline">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline">KisanLens AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                location.pathname === link.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--color-border)] hover:bg-gray-50 transition-colors cursor-pointer bg-white"
          aria-label="Toggle language"
        >
          <Globe className="w-4 h-4" />
          {language === 'en' ? 'हिंदी' : 'ENG'}
        </button>
      </div>
    </nav>
  );
}
