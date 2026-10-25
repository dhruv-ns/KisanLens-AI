import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, MicOff, Trash2, Loader2, Bot, User, Leaf,
  Volume2, VolumeX, Square, Settings2, Sparkles, Radio,
  AlertCircle, X, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { assistantApi, voiceApi } from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioBase64?: string;
  audioContentType?: string;
  isVoice?: boolean;
}

type VoiceMode = 'text' | 'voice';

export default function Assistant() {
  const { t, language } = useLanguage();
  const { farm } = useFarm();

  // ── Core state ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('voice');
  const [showTranscript, setShowTranscript] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<any>(null);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // ── Hooks ──
  const recorder = useVoiceRecorder(60000);
  const audioPlayer = useAudioPlayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Check voice service status on mount ──
  useEffect(() => {
    voiceApi.getStatus().then(res => {
      setVoiceStatus(res.data);
    }).catch(() => {
      setVoiceStatus({ gnaniConfigured: false, stt: 'webSpeechAPI', tts: 'webSpeechSynthesis' });
    });
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Language code mapper ──
  const getLanguageCode = useCallback(() => {
    return language === 'hi' ? 'hi-IN' : 'en-IN';
  }, [language]);

  // ── Handle voice recording complete ──
  useEffect(() => {
    if (recorder.audioBlob && !recorder.isRecording) {
      handleVoiceSubmit(recorder.audioBlob);
    }
  }, [recorder.audioBlob, recorder.isRecording]);

  // ── Voice Submit (Full Pipeline) ──
  const handleVoiceSubmit = async (audioBlob: Blob) => {
    if (loading) return;
    setLoading(true);

    try {
      const context = {
        crop: farm?.crop || '',
        cropStage: farm?.cropStage || '',
        location: farm?.location?.city || '',
      };

      // Try server-side Gnani pipeline first
      if (voiceStatus?.gnaniConfigured) {
        const res = await voiceApi.chat({
          audioBlob,
          sessionId,
          language: getLanguageCode(),
          context,
          wantAudio: autoPlayAudio,
        });

        const data = res.data;

        // Show transcript preview
        if (data.userTranscript) {
          setPendingTranscript(data.userTranscript);
          setShowTranscript(true);

          // Add user message
          const userMsg: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: data.userTranscript,
            timestamp: new Date().toISOString(),
            isVoice: true,
          };

          const aiMsg: Message = {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: data.timestamp,
            audioBase64: data.audioBase64,
            audioContentType: data.audioContentType,
          };

          setMessages(prev => [...prev, userMsg, aiMsg]);

          // Auto-play audio response
          if (autoPlayAudio && data.hasAudio && data.audioBase64) {
            playAudioFromBase64(data.audioBase64, data.audioContentType, aiMsg.id, data.response);
          } else if (autoPlayAudio) {
            audioPlayer.speakBrowser(data.response, getLanguageCode());
          }

          setTimeout(() => setShowTranscript(false), 3000);
        }
      } else {
        // Fallback: use browser SpeechRecognition for STT, then text API
        toast('Server voice not configured. Using browser voice...', { icon: 'ℹ️' });
        await handleBrowserSTTFallback(audioBlob);
      }
    } catch (err: any) {
      const errorMsg = language === 'hi'
        ? 'आवाज़ प्रक्रिया में समस्या। कृपया फिर से बोलें।'
        : 'Voice processing failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Browser STT Fallback ──
  const handleBrowserSTTFallback = async (_audioBlob: Blob) => {
    toast.error(language === 'hi'
      ? 'कृपया माइक बटन दबाकर बोलें या टाइप करें।'
      : 'Please use the mic button or type your question.');
  };

  // ── Text Submit ──
  const sendMessage = async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const context = {
        crop: farm?.crop || '',
        cropStage: farm?.cropStage || '',
        location: farm?.location?.city || '',
      };

      // Use voice chat endpoint if Gnani is configured (for TTS response)
      if (voiceStatus?.gnaniConfigured) {
        const res = await voiceApi.chat({
          message: msg,
          sessionId,
          language: getLanguageCode(),
          context,
          wantAudio: autoPlayAudio,
        });

        const data = res.data;
        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp,
          audioBase64: data.audioBase64,
          audioContentType: data.audioContentType,
        };

        setMessages(prev => [...prev, aiMsg]);

        if (autoPlayAudio && data.hasAudio && data.audioBase64) {
          playAudioFromBase64(data.audioBase64, data.audioContentType, aiMsg.id, data.response);
        } else if (autoPlayAudio && data.response) {
          audioPlayer.speakBrowser(data.response, getLanguageCode());
        }
      } else {
        // Standard text assistant
        const res = await assistantApi.sendMessage(msg, sessionId, context);
        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: res.data.response,
          timestamp: res.data.timestamp,
        };
        setMessages(prev => [...prev, aiMsg]);
        if (autoPlayAudio && res.data.response) {
          audioPlayer.speakBrowser(res.data.response, getLanguageCode());
        }
      }
    } catch (err: any) {
      const errorMsg = language === 'hi'
        ? 'AI सहायक अभी उपलब्ध नहीं है। कृपया पुनः प्रयास करें।'
        : 'AI assistant is temporarily unavailable. Please try again.';
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date().toISOString(),
      }]);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Audio Playback ──
  const playAudioFromBase64 = (base64: string, contentType: string, messageId: string, fallbackText?: string) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType || 'audio/wav' });
      setPlayingMessageId(messageId);
      audioPlayer.play(blob, fallbackText, getLanguageCode());
    } catch {
      setPlayingMessageId(messageId);
      if (fallbackText) {
        audioPlayer.speakBrowser(fallbackText, getLanguageCode());
      } else {
        const msg = messages.find(m => m.id === messageId);
        if (msg) audioPlayer.speakBrowser(msg.content, getLanguageCode());
      }
    }
  };

  const handlePlayMessage = async (msg: Message) => {
    if (playingMessageId === msg.id && (audioPlayer.isPlaying || audioPlayer.isBrowserSpeaking)) {
      audioPlayer.stop();
      audioPlayer.stopBrowserSpeech();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(msg.id);

    if (msg.audioBase64) {
      playAudioFromBase64(msg.audioBase64, msg.audioContentType || 'audio/wav', msg.id, msg.content);
    } else {
      // Try Gnani TTS on the fly, with immediate browser speech fallback
      try {
        const audioBlob = await voiceApi.synthesize(msg.content.slice(0, 1000), getLanguageCode());
        audioPlayer.play(audioBlob, msg.content, getLanguageCode());
      } catch {
        audioPlayer.speakBrowser(msg.content, getLanguageCode());
      }
    }
  };

  const stopAllAudio = () => {
    audioPlayer.stop();
    audioPlayer.stopBrowserSpeech();
    setPlayingMessageId(null);
  };

  // ── Clear Chat ──
  const clearChat = async () => {
    try { await assistantApi.clearHistory(sessionId); } catch { /* ignore */ }
    setMessages([]);
    stopAllAudio();
  };

  // ── Browser Voice (WebSpeechAPI fallback for recording) ──
  const browserRecognitionRef = useRef<any>(null);
  const [isBrowserListening, setIsBrowserListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getLanguageCode();

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setPendingTranscript(finalTranscript);
          setShowTranscript(true);
          sendMessage(finalTranscript);
          setIsBrowserListening(false);
          setTimeout(() => setShowTranscript(false), 3000);
        } else if (interimTranscript) {
          setPendingTranscript(interimTranscript + '...');
          setShowTranscript(true);
        }
      };

      recognition.onerror = () => setIsBrowserListening(false);
      recognition.onend = () => setIsBrowserListening(false);

      browserRecognitionRef.current = recognition;
    }
    return () => { browserRecognitionRef.current?.abort(); };
  }, [language]);

  // ── Toggle Voice Recording ──
  const toggleVoice = () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
      return;
    }

    if (isBrowserListening) {
      browserRecognitionRef.current?.stop();
      setIsBrowserListening(false);
      return;
    }

    // Use MediaRecorder if Gnani is configured (server-side STT)
    if (voiceStatus?.gnaniConfigured && recorder.isSupported) {
      recorder.startRecording();
    } else if (browserRecognitionRef.current) {
      // Fallback to browser SpeechRecognition
      browserRecognitionRef.current.lang = getLanguageCode();
      browserRecognitionRef.current.start();
      setIsBrowserListening(true);
    } else {
      toast.error(t('assistant.voiceNotSupported'));
    }
  };

  const isListening = recorder.isRecording || isBrowserListening;

  // ── Suggested Questions ──
  const suggestedQuestions = language === 'hi'
    ? [
        { text: '🌾 आज खेत में क्या करें?', icon: '🌾' },
        { text: '🍅 टमाटर में पत्ते पीले हो रहे हैं', icon: '🍅' },
        { text: '🌧️ बारिश में सिंचाई करें क्या?', icon: '🌧️' },
        { text: '💰 गेहूं का बाज़ार भाव क्या है?', icon: '💰' },
      ]
    : [
        { text: '🌾 What should I do in my field today?', icon: '🌾' },
        { text: '🍅 Yellow leaves on my tomato plants', icon: '🍅' },
        { text: '🌧️ Should I irrigate before rain?', icon: '🌧️' },
        { text: '💰 Current wheat market price?', icon: '💰' },
      ];

  // ── Format duration ──
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-2xl mx-auto">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              {language === 'hi' ? 'AI कृषि सहायक' : 'AI Farm Assistant'}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 text-primary-700">
                <Radio className="w-2.5 h-2.5" />
                {voiceStatus?.gnaniConfigured ? 'Voice AI' : 'Text + Voice'}
              </span>
            </h1>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {language === 'hi' ? 'हिंदी या English में बोलें या लिखें' : 'Speak or type in Hindi or English'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Auto-play toggle */}
          <button
            onClick={() => {
              setAutoPlayAudio(!autoPlayAudio);
              if (autoPlayAudio) stopAllAudio();
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border-none ${
              autoPlayAudio ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
            }`}
            title={autoPlayAudio ? 'Auto-play ON' : 'Auto-play OFF'}
          >
            {autoPlayAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {/* Clear */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('assistant.clear')}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Transcription Preview Banner ═══ */}
      {showTranscript && pendingTranscript && (
        <div className="voice-transcript-banner mb-2 mx-1 px-4 py-2.5 rounded-xl flex items-center gap-3 animate-fadeSlideIn">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Mic className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider mb-0.5">
              {language === 'hi' ? 'आपने कहा' : 'You said'}
            </p>
            <p className="text-sm text-white font-medium truncate">{pendingTranscript}</p>
          </div>
          <button onClick={() => setShowTranscript(false)} className="text-white/60 hover:text-white bg-transparent border-none cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ Messages ═══ */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 px-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-4">
            {/* Hero Voice Indicator */}
            <div className="voice-hero-orb">
              <div className="voice-orb-ring" />
              <div className="voice-orb-inner">
                <Leaf className="w-10 h-10 text-primary-600" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
                {language === 'hi' ? 'नमस्ते! मैं आपका कृषि सहायक हूं' : 'Namaste! I\'m your farm assistant'}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {language === 'hi'
                  ? 'माइक बटन दबाकर हिंदी में बोलें या नीचे टाइप करें'
                  : 'Press the mic button to speak in Hindi or type below'}
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q.text.replace(/^[^\s]+ /, '')); inputRef.current?.focus(); }}
                  className="px-3 py-3 text-xs bg-white border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:bg-primary-50 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer text-left leading-relaxed"
                >
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeSlideIn`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
              )}
              <div className="max-w-[80%] flex flex-col gap-1">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-br-md shadow-md shadow-primary-200'
                    : 'bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-md shadow-sm'
                }`}>
                  {msg.isVoice && msg.role === 'user' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/70 mb-1">
                      <Mic className="w-2.5 h-2.5" /> {language === 'hi' ? 'आवाज़ से' : 'Voice'}
                    </span>
                  )}
                  <div>{msg.content}</div>
                </div>
                {/* Play audio button for assistant messages */}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handlePlayMessage(msg)}
                    className={`self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border-none ${
                      playingMessageId === msg.id && (audioPlayer.isPlaying || audioPlayer.isBrowserSpeaking)
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-50 text-[var(--color-text-muted)] hover:bg-gray-100'
                    }`}
                  >
                    {playingMessageId === msg.id && (audioPlayer.isPlaying || audioPlayer.isBrowserSpeaking) ? (
                      <>
                        <div className="voice-bars-mini">
                          <span /><span /><span />
                        </div>
                        {language === 'hi' ? 'रोकें' : 'Stop'}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        {language === 'hi' ? 'सुनें' : 'Listen'}
                      </>
                    )}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2 animate-fadeSlideIn">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-primary-600" />
            </div>
            <div className="bg-white border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <div className="voice-thinking-dots">
                  <span /><span /><span />
                </div>
                {language === 'hi' ? 'सोच रहा हूं...' : 'Thinking...'}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ═══ Recording Indicator ═══ */}
      {isListening && (
        <div className="voice-recording-bar mx-1 mb-2 px-4 py-3 rounded-xl flex items-center gap-3">
          <div className="voice-recording-pulse">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">
              {language === 'hi' ? 'सुन रहा हूं...' : 'Listening...'}
            </p>
            {recorder.isRecording && (
              <p className="text-xs text-red-500">{formatDuration(recorder.duration)} / 1:00</p>
            )}
          </div>
          <button
            onClick={() => {
              if (recorder.isRecording) recorder.cancelRecording();
              if (isBrowserListening) {
                browserRecognitionRef.current?.stop();
                setIsBrowserListening(false);
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer border-none transition-colors"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
        </div>
      )}

      {/* ═══ Input Bar ═══ */}
      <div className="voice-input-bar flex items-center gap-2 pt-3 px-1 border-t border-[var(--color-border)]">
        {/* Voice Button */}
        <button
          onClick={toggleVoice}
          disabled={loading}
          className={`voice-mic-button w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer border-none shadow-lg ${
            isListening
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200 scale-110'
              : loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-200 hover:shadow-xl hover:scale-105'
          }`}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? (
            <div className="voice-waves-container">
              <MicOff className="w-5 h-5" />
            </div>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={language === 'hi' ? 'हिंदी या English में टाइप करें...' : 'Type in Hindi or English...'}
            disabled={loading || isListening}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:opacity-50 transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border-none ${
            input.trim() && !loading
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* ═══ Error Display ═══ */}
      {recorder.error && (
        <div className="mx-1 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{recorder.error}</span>
          <button onClick={() => recorder.cancelRecording()} className="ml-auto text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
