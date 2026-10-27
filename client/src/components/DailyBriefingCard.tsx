import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Sparkles, Award, ChevronDown, ChevronUp, RefreshCw, Radio, PhoneCall, TrendingUp, CloudRain } from 'lucide-react';
import { briefingApi } from '../services/api';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import toast from 'react-hot-toast';

interface DailyBriefingCardProps {
  farm?: {
    crop?: string;
    farmName?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    area?: number;
    cropStage?: string;
  } | null;
}

export default function DailyBriefingCard({ farm }: DailyBriefingCardProps) {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStyle, setActiveStyle] = useState<'hinglish' | 'hindi' | 'english'>('hinglish');
  const [showScript, setShowScript] = useState(false);

  const { play, stop, isPlaying } = useAudioPlayer();

  const loadBriefing = async (style: 'hinglish' | 'hindi' | 'english' = activeStyle) => {
    setLoading(true);
    try {
      const res = await briefingApi.getDailyBriefing({
        crop: farm?.crop || 'Tomato',
        farmName: farm?.farmName || 'My Farm',
        city: farm?.city || 'Karnal',
        state: farm?.state || 'Haryana',
        languageStyle: style,
      });
      if (res?.data) {
        setBriefing(res.data);
      }
    } catch (err: any) {
      console.warn('Daily briefing fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefing(activeStyle);
  }, [farm, activeStyle]);

  // Handle Play/Stop of synthesized audio
  const handleToggleAudio = () => {
    if (isPlaying) {
      stop();
      return;
    }

    if (!briefing?.audio?.audioBase64) {
      toast('Audio briefing is still generating, please wait.', { icon: '⏳' });
      return;
    }

    try {
      const binary = atob(briefing.audio.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: briefing.audio.audioContentType || 'audio/wav' });
      play(blob, '', activeStyle === 'english' ? 'en-IN' : 'hi-IN');
    } catch (e) {
      console.error('Audio play error:', e);
      toast.error('Failed to play audio briefing.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-emerald-50/60 to-teal-50 border border-amber-200/80 rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden space-y-4">
      {/* Decorative accent orb */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300/80 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Mixed Vibes Award Contender</span>
            <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.2 rounded font-mono">Gnani Timbre</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Kisan Vani: Daily Audio Briefing</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-600">
            Personalized code-mixed farm broadcast with localized weather, live Mandi rates, and agronomic advice.
          </p>
        </div>

        {/* Style Selector Pills */}
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-2xl p-1 border border-slate-200/80 shadow-2xs self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setActiveStyle('hinglish')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
              activeStyle === 'hinglish'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Hinglish
          </button>
          <button
            type="button"
            onClick={() => setActiveStyle('hindi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
              activeStyle === 'hindi'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => setActiveStyle('english')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
              activeStyle === 'english'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Main Player Row */}
      <div className="bg-white/95 backdrop-blur rounded-2xl p-4 border border-emerald-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Play Button & Wave */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleAudio}
            disabled={loading}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-transform active:scale-95 shadow-md cursor-pointer border-none shrink-0 ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200'
            }`}
            title={isPlaying ? 'Pause Audio' : 'Play Daily Briefing'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {isPlaying ? 'Now Playing Daily Briefing' : 'Listen to Today\'s Farm Briefing'}
              </span>
              {briefing?.farm?.crop && (
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {briefing.farm.crop}
                </span>
              )}
            </div>

            {/* Equalizer Visualizer Bars */}
            {isPlaying ? (
              <div className="flex items-center gap-1 mt-1.5 h-4">
                <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.6s]" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-duration:0.4s]" />
                <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-duration:0.5s]" />
                <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-duration:0.7s]" />
                <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-duration:0.45s]" />
                <span className="text-xs text-emerald-700 font-mono ml-2">Playing 24kHz Gnani Timbre audio</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                {activeStyle === 'hinglish'
                  ? 'Code-Mixed Hinglish audio synthesized via Gnani Timbre v2.5'
                  : activeStyle === 'hindi'
                  ? 'प्राकृतिक हिंदी वाणी (Gnani Timbre v2.5)'
                  : 'Synthesized voice broadcast (Gnani Timbre v2.5)'}
              </p>
            )}
          </div>
        </div>

        {/* Live Metrics Chips */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {briefing?.metrics && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs font-semibold text-amber-900">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                <span>₹{briefing.metrics.mandiModalPrice}/q</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200/80 text-xs font-semibold text-blue-900">
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                <span>{briefing.metrics.temperature}°C ({briefing.metrics.rainProbability}% rain)</span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => loadBriefing(activeStyle)}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 bg-white"
            title="Refresh briefing data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transcript Accordion */}
      {briefing?.content && (
        <div className="bg-white/80 rounded-2xl border border-slate-200/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowScript(!showScript)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="flex items-center gap-1.5">
              <span>Read {activeStyle.toUpperCase()} Broadcast Script</span>
              <span className="text-[10px] font-normal text-slate-500">
                ({briefing.content[activeStyle]?.length || 0} characters)
              </span>
            </span>
            {showScript ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showScript && (
            <div className="p-4 pt-1 border-t border-slate-100 text-xs text-slate-800 leading-relaxed font-sans bg-amber-50/20 whitespace-pre-line">
              {briefing.content[activeStyle] || briefing.content.spokenText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
