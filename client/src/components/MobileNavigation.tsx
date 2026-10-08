import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, Cloud, Store, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function MobileNavigation() {
  const { t } = useLanguage();
  const location = useLocation();

  const tabs = [
    { path: '/dashboard', icon: Home, label: t('nav.home') },
    { path: '/crop-scanner', icon: Camera, label: t('nav.crop') },
    { path: '/weather', icon: Cloud, label: t('nav.weather') },
    { path: '/market', icon: Store, label: t('nav.market') },
    { path: '/assistant', icon: MessageCircle, label: t('nav.assistant') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[56px] no-underline ${
                isActive
                  ? 'text-primary-700'
                  : 'text-[var(--color-text-muted)]'
              }`}
              aria-label={label}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
