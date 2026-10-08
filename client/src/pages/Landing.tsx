import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Cloud, Store, MessageCircle, ChevronRight, Leaf, Shield, Zap, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Landing() {
  const { language, setLanguage, t } = useLanguage();

  const features = [
    { icon: Camera, title: 'AI Crop Scanner', titleHi: 'AI फसल स्कैनर', desc: 'Upload crop images for instant AI-powered health analysis', descHi: 'तुरंत AI-संचालित स्वास्थ्य विश्लेषण के लिए फसल की तस्वीरें अपलोड करें', color: 'bg-green-100 text-green-700' },
    { icon: Cloud, title: 'Weather Intelligence', titleHi: 'मौसम बुद्धिमत्ता', desc: 'Weather-based farming recommendations and forecasts', descHi: 'मौसम-आधारित खेती की सिफारिशें और पूर्वानुमान', color: 'bg-blue-100 text-blue-700' },
    { icon: Store, title: 'Mandi Prices', titleHi: 'मंडी भाव', desc: 'Agricultural commodity prices, trends and market insights', descHi: 'कृषि जिंस मूल्य, रुझान और बाज़ार अंतर्दृष्टि', color: 'bg-amber-100 text-amber-700' },
    { icon: MessageCircle, title: 'AI Assistant', titleHi: 'AI सहायक', desc: 'Ask farming questions in Hindi or English', descHi: 'हिंदी या अंग्रेजी में खेती के सवाल पूछें', color: 'bg-purple-100 text-purple-700' },
    { icon: Shield, title: 'Farm Actions', titleHi: 'खेत कार्य', desc: 'Daily actionable farming decisions based on data', descHi: 'डेटा पर आधारित दैनिक कार्रवाई योग्य खेती निर्णय', color: 'bg-emerald-100 text-emerald-700' },
    { icon: Zap, title: 'Smart Decisions', titleHi: 'स्मार्ट निर्णय', desc: 'Crop health + weather + market = better farming', descHi: 'फसल स्वास्थ्य + मौसम + बाज़ार = बेहतर खेती', color: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-primary-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-primary-800">KisanLens AI</span>
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer bg-white"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'हिंदी' : 'ENG'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
          <Leaf className="w-4 h-4" />
          {language === 'en' ? 'AI-Powered Farm Intelligence' : 'AI-संचालित कृषि बुद्धिमत्ता'}
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-primary-900 leading-tight mb-6">
          {language === 'en' ? (
            <>See Your Farm.<br className="hidden md:block" /> Understand Your Crop.<br className="hidden md:block" /> <span className="text-primary-600">Make Better Decisions.</span></>
          ) : (
            <>अपना खेत देखें।<br className="hidden md:block" /> अपनी फसल समझें।<br className="hidden md:block" /> <span className="text-primary-600">बेहतर निर्णय लें।</span></>
          )}
        </h1>

        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
          {language === 'en'
            ? 'KisanLens AI helps farmers understand crop health, weather conditions, market signals and daily farm actions using AI.'
            : 'किसानलेन्स AI किसानों को AI का उपयोग करके फसल स्वास्थ्य, मौसम, बाज़ार संकेत और दैनिक खेत कार्यों को समझने में मदद करता है।'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 no-underline"
          >
            {language === 'en' ? 'Get Started' : 'शुरू करें'}
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            to="/crop-scanner"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-primary-700 rounded-xl font-semibold text-lg border-2 border-primary-200 hover:bg-primary-50 transition-all no-underline"
          >
            <Camera className="w-5 h-5" />
            {language === 'en' ? 'Scan Crop Now' : 'अभी फसल स्कैन करें'}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-primary-900">
          {language === 'en' ? 'Everything Your Farm Needs' : 'आपके खेत को जो भी चाहिए'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--color-text-primary)]">
                {language === 'en' ? f.title : f.titleHi}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {language === 'en' ? f.desc : f.descHi}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 text-primary-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Leaf className="w-5 h-5" />
            <span className="font-bold">KisanLens AI</span>
          </div>
          <p className="text-sm text-primary-300">
            {language === 'en'
              ? 'AI-Powered Intelligence for Smarter Farming'
              : 'स्मार्ट खेती के लिए AI-संचालित बुद्धिमत्ता'}
          </p>
        </div>
      </footer>
    </div>
  );
}
