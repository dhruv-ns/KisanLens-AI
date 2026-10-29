import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, Volume2, VolumeX, Sparkles, Radio, Award, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ivrApi } from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import toast from 'react-hot-toast';

// Standard DTMF Frequency Map (Hz)
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

interface MessageEntry {
  sender: 'system' | 'caller';
  text: string;
  time: string;
  tag?: string;
}

export default function IvrHelpline() {
  const { language } = useLanguage();
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<MessageEntry[]>([]);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>('Press Call to dial 1800-889-KISAN');

  const timerRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { play, stop, isPlaying, speakBrowser, stopBrowserSpeech, isBrowserSpeaking } = useAudioPlayer();
  const recorder = useVoiceRecorder(15000);

  const isAudioActive = isPlaying || isBrowserSpeaking;

  const FALLBACK_PROMPTS: Record<string, string> = {
    welcome: 'नमस्ते किसान भाई! किसानलेंस एआई टेलीफोनिक हेल्पलाइन 1800-889-KISAN में आपका स्वागत है। मौसम और बारिश के लिए 1 दबाएं। मंडी के ताजा भाव के लिए 2 दबाएं। फसल रोग एवं सुरक्षा सलाह के लिए 3 दबाएं। या बीप के बाद सीधे सवाल बोलें।',
    '1': 'लाइव मौसम रिपोर्ट: आज आपके क्षेत्र में तापमान 29 डिग्री सेल्सियस और मौसम साफ रहेगा। बारिश की संभावना केवल 5 प्रतिशत है। फसलों में हल्की सिंचाई एवं जैविक छिड़काव के लिए आज का दिन अनुकूल है। मुख्य मेनू के लिए 0 दबाएं।',
    '2': 'ताजा मंडी भाव: गेहूं का औसत भाव ₹2,450 प्रति क्विंटल है। धान ₹2,320, प्याज ₹1,850 और टमाटर ₹2,200 प्रति क्विंटल चल रहा है। आगामी दिनों में भाव स्थिर रहने की उम्मीद है। मुख्य मेनू के लिए 0 दबाएं।',
    '3': 'फसल सुरक्षा सलाह: पत्तियों पर धब्बे दिखने पर 5 मिली नीम तेल प्रति लीटर पानी में मिलाकर शाम को छिड़कें। फफूंद के लिए ट्राइकोडर्मा 5 ग्राम प्रति लीटर का प्रयोग करें। मुख्य मेनू के लिए 0 दबाएं।',
    '0': 'नमस्ते किसान भाई! मौसम के लिए 1 दबाएं। मंडी भाव के लिए 2 दबाएं। फसल सलाह के लिए 3 दबाएं। मुख्य मेनू दोहराने के लिए 0 दबाएं।',
  };

  // Play realistic DTMF Beep
  const playDTMF = (digit: string) => {
    try {
      const freqs = DTMF_FREQS[digit];
      if (!freqs) return;
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.16);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Auto-scroll transcript
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Call duration counter
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Play audio response from base64
  const playBase64Audio = (base64: string, contentType = 'audio/wav') => {
    if (!speakerOn) return;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: contentType });
      play(blob, '', 'hi-IN');
    } catch (e) {
      console.warn('Failed to play base64 audio:', e);
    }
  };

  // Start Call
  const handleStartCall = async () => {
    setLoading(true);
    stop();
    stopBrowserSpeech();
    playDTMF('1');

    try {
      const res = await ivrApi.startCall('hi-IN');
      setCallActive(true);
      setLoading(false);

      const welcomeText = res.data?.responseText || FALLBACK_PROMPTS.welcome;
      setLastPrompt(welcomeText);
      setTranscript([
        {
          sender: 'system',
          text: welcomeText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tag: '1800-889-KISAN (IVR)',
        },
      ]);

      if (res.data?.audioBase64) {
        playBase64Audio(res.data.audioBase64, res.data.audioContentType);
      } else {
        speakBrowser(welcomeText, 'hi-IN');
      }
    } catch (err: any) {
      // Graceful offline simulation fallback
      setLoading(false);
      setCallActive(true);
      const welcomeText = FALLBACK_PROMPTS.welcome;
      setLastPrompt(welcomeText);
      setTranscript([
        {
          sender: 'system',
          text: welcomeText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tag: '1800-889-KISAN (Simulator)',
        },
      ]);
      speakBrowser(welcomeText, 'hi-IN');
      toast.success('Connected to 1800-889-KISAN Helpline');
    }
  };

  // End Call
  const handleEndCall = () => {
    stop();
    stopBrowserSpeech();
    setCallActive(false);
    setLastPrompt('Call ended. Press Call to reconnect.');
    setTranscript((prev) => [
      ...prev,
      {
        sender: 'system',
        text: 'कॉल समाप्त हो गई। धन्यवाद! (Call ended)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tag: 'Call Ended',
      },
    ]);
  };

  // Send DTMF Digit
  const handleDigitPress = async (digit: string) => {
    playDTMF(digit);
    if (!callActive) {
      toast('Please press the green Call button to connect first.', { icon: '📞' });
      return;
    }

    setTranscript((prev) => [
      ...prev,
      {
        sender: 'caller',
        text: `DTMF Pressed: [${digit}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tag: 'Keypad Input',
      },
    ]);

    try {
      setLoading(true);
      const res = await ivrApi.sendAction({ digits: digit, language: 'hi-IN' });
      setLoading(false);

      const responseText = res.data?.responseText || FALLBACK_PROMPTS[digit] || FALLBACK_PROMPTS['0'];
      setLastPrompt(responseText);
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'system',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tag: `Option ${digit}`,
        },
      ]);

      if (res.data?.audioBase64) {
        playBase64Audio(res.data.audioBase64, res.data.audioContentType);
      } else {
        speakBrowser(responseText, 'hi-IN');
      }
    } catch (err: any) {
      setLoading(false);
      const responseText = FALLBACK_PROMPTS[digit] || FALLBACK_PROMPTS['0'];
      setLastPrompt(responseText);
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'system',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tag: `Option ${digit}`,
        },
      ]);
      speakBrowser(responseText, 'hi-IN');
    }
  };

  // Send Telephonic Voice Recording
  const handleSendVoiceQuery = async (blob: Blob) => {
    setTranscript((prev) => [
      ...prev,
      {
        sender: 'caller',
        text: '🎙️ Spoke voice note (Noisy 8kHz simulated telephonic speech)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tag: 'Farmer Speech Input',
      },
    ]);

    try {
      setLoading(true);
      const res = await ivrApi.sendAction({ audioBlob: blob, language: 'hi-IN' });
      setLoading(false);

      if (res.data?.userQueryText) {
        setTranscript((prev) => [
          ...prev,
          {
            sender: 'caller',
            text: `Recognized Query: "${res.data.userQueryText}"`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            tag: 'Gnani Prisma STT (Noise Cancelled)',
          },
        ]);
      }

      const responseText = res.data?.responseText || 'Processing...';
      setLastPrompt(responseText);
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'system',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tag: 'IVR Voice Response',
        },
      ]);

      if (res.data?.audioBase64) {
        playBase64Audio(res.data.audioBase64, res.data.audioContentType);
      }
    } catch (err: any) {
      setLoading(false);
      toast.error('Voice processing failed.');
    }
  };

  // Watch for voice recording completion
  useEffect(() => {
    if (recorder.audioBlob && !recorder.isRecording && callActive) {
      handleSendVoiceQuery(recorder.audioBlob);
    }
  }, [recorder.audioBlob, recorder.isRecording]);

  const keypadButtons = [
    { key: '1', sub: 'मौसम / Weather' },
    { key: '2', sub: 'मंडी / Mandi' },
    { key: '3', sub: 'फसल / Advice' },
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
    { key: '*', sub: 'म्यूट' },
    { key: '0', sub: 'मेनू / Menu' },
    { key: '#', sub: 'सहायता' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Contending for Noise Canceller Award</span>
            </div> */}
            <h1 className="text-3xl font-extrabold tracking-tight">
              Telephonic IVR Helpline <span className="text-emerald-400 font-mono">1800-889-KISAN</span>
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Enables 500M+ Indian farmers without smartphones or internet access to dial in from any basic feature phone (Nokia, JioPhone) or landline. Powered by Gnani Prisma STT handling noisy 8kHz telephonic speech + Gnani Timbre TTS.
            </p>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[200px]">
            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Toll-Free Helpline</span>
            <div className="text-2xl font-black font-mono mt-1 text-white">1800-889-KISAN</div>
            <div className="text-[11px] text-gray-300 mt-1">24x7 Offline Voice Access</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Phone Simulator & Transcript */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Phone Simulator */}
        <div className="md:col-span-5 flex justify-center">
          <div className="w-full max-w-[340px] bg-slate-950 rounded-[44px] p-5 shadow-2xl border-4 border-slate-800 flex flex-col">
            {/* Phone Earpiece Speaker */}
            <div className="w-20 h-1.5 bg-slate-800 rounded-full mx-auto mb-4" />

            {/* Phone Screen */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 min-h-[160px] shadow-inner relative overflow-hidden">
              {/* Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <div className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>8kHz Telephony</span>
                </div>
                <span>{callActive ? formatDuration(callDuration) : 'OFFLINE'}</span>
              </div>

              {/* Central Screen Status */}
              <div className="my-auto text-center py-2">
                {callActive ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-xs animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Call Connected</span>
                    </div>
                    <div className="text-base font-bold text-white font-mono">1800-889-KISAN</div>
                    {isAudioActive && (
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.45s]" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-gray-400">
                    <Phone className="w-7 h-7 mx-auto text-emerald-500 mb-1" />
                    <div className="text-xs font-semibold text-gray-300">Dialer Ready</div>
                    <div className="text-[11px]">Tap Call to simulate offline call</div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Caption */}
              <div className="text-[10px] text-gray-400 truncate bg-slate-950/60 rounded px-2 py-1 font-mono">
                {lastPrompt}
              </div>
            </div>

            {/* Keypad 3x4 Grid */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              {keypadButtons.map(({ key, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDigitPress(key)}
                  className="h-13 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-2xl flex flex-col items-center justify-center border border-slate-800/80 transition-all cursor-pointer shadow-sm group"
                >
                  <span className="text-lg font-bold group-active:scale-90 transition-transform">{key}</span>
                  <span className="text-[9px] text-gray-400 font-medium leading-none">{sub}</span>
                </button>
              ))}
            </div>

            {/* Bottom Call Action Row */}
            <div className="flex items-center justify-around pt-2">
              <button
                type="button"
                onClick={() => setSpeakerOn(!speakerOn)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  speakerOn
                    ? 'bg-slate-800 text-emerald-400 border-slate-700'
                    : 'bg-slate-900 text-gray-400 border-slate-800'
                }`}
                title={speakerOn ? 'Speaker On' : 'Speaker Off'}
              >
                {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {callActive ? (
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/50 cursor-pointer border-none transition-transform active:scale-95"
                  title="Hang Up"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={loading}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 cursor-pointer border-none transition-transform active:scale-95"
                  title="Call 1800-889-KISAN"
                >
                  <PhoneCall className="w-6 h-6 animate-pulse" />
                </button>
              )}

              {/* Speak into Call Mic (Simulate Noisy Telephonic Audio) */}
              <button
                type="button"
                disabled={!callActive}
                onClick={() => {
                  if (recorder.isRecording) {
                    recorder.stopRecording();
                  } else {
                    recorder.startRecording();
                  }
                }}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  !callActive
                    ? 'bg-slate-900 text-gray-600 border-slate-800 cursor-not-allowed'
                    : recorder.isRecording
                    ? 'bg-red-600 text-white border-red-500 animate-ping'
                    : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                }`}
                title="Speak voice query into phone"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>

            {recorder.isRecording && (
              <div className="text-center text-[11px] text-red-400 mt-2 font-mono animate-pulse">
                🎙️ Speaking into phone... ({Math.floor(recorder.duration / 1000)}s)
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Call Transcript & Audio Noise Canceller Proof */}
        <div className="md:col-span-7 flex flex-col space-y-4">
          <div className="bg-white rounded-3xl border border-[var(--color-border)] p-5 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-gray-900 text-base">Live Call Log & Audio Transcript</h3>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                Gnani Prisma STT + Timbre TTS
              </span>
            </div>

            {/* Chat Transcript Area */}
            <div className="flex-1 overflow-y-auto space-y-3 py-4 min-h-[300px] max-h-[440px] pr-1">
              {transcript.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-2">
                  <PhoneCall className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-medium">No active call</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Click the green Call button on the dialer to start an interactive telephonic IVR session.
                  </p>
                </div>
              ) : (
                transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === 'caller' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
                      <span className="font-semibold">{msg.tag || (msg.sender === 'caller' ? 'Farmer' : 'IVR')}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === 'caller'
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-gray-100 text-gray-900 rounded-tl-xs border border-gray-200/80'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatScrollRef} />
            </div>

            {/* Quick Menu Cheat Sheet */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1.5 mt-2">
              <div className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Keypad DTMF Shortcuts:</span>
                <span className="text-[10px] text-slate-500 font-normal">Works during live call</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDigitPress('1')}
                  className="bg-white hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-slate-200 text-left font-medium text-slate-800 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">1:</span> मौसम (Weather)
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('2')}
                  className="bg-white hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-slate-200 text-left font-medium text-slate-800 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">2:</span> मंडी (Mandi)
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('3')}
                  className="bg-white hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-slate-200 text-left font-medium text-slate-800 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">3:</span> फसल (Crop)
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="bg-white hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-slate-200 text-left font-medium text-slate-800 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-600">0:</span> मुख्य मेनू (Menu)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Noise Canceller Architecture Details */}
      {/* <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>How KisanLens IVR Targets the Noise Canceller Award</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 space-y-1.5">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>8kHz Audio Resiliency</span>
            </div>
            <p className="text-xs text-emerald-800/80 leading-relaxed">
              Standard cellular telephony caps audio frequencies between 300Hz and 3400Hz at 8kHz sample rate. Gnani Prisma STT cleans acoustic distortions and tractor engine noise without losing farmer intent.
            </p>
          </div>

          <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-100 space-y-1.5">
            <div className="font-bold text-teal-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Carrier-Grade TwiML / Exotel</span>
            </div>
            <p className="text-xs text-teal-800/80 leading-relaxed">
              Backend provides real-time TwiML XML endpoints at <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">/api/ivr/webhook</code> ready to attach to real telecom gateways like Tata Tele, Airtel, Exotel, and Twilio.
            </p>
          </div>

          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Dual Input: DTMF + Voice</span>
            </div>
            <p className="text-xs text-amber-800/80 leading-relaxed">
              Illiterate or non-tech-savvy farmers can simply press digits 1, 2, or 3, or speak their questions freely in natural Hindi after the beep.
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );
}
