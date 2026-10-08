import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Trash2, Loader2, Bot, User, Leaf } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { assistantApi } from '../services/api';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Assistant() {
  const { t, language } = useLanguage();
  const { farm } = useFarm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }

    return () => { recognitionRef.current?.abort(); };
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const context = {
        crop: farm?.crop || '',
        cropStage: farm?.cropStage || '',
        location: farm?.location?.city || '',
      };

      const res = await assistantApi.sendMessage(userMessage.content, sessionId, context);

      const aiMessage: Message = {
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMsg = language === 'en' ? 'AI assistant is temporarily unavailable.' : 'AI सहायक अस्थायी रूप से अनुपलब्ध है।';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date().toISOString() }]);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error(t('assistant.voiceNotSupported'));
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const clearChat = async () => {
    try {
      await assistantApi.clearHistory(sessionId);
    } catch { /* ignore */ }
    setMessages([]);
  };

  const suggestedQuestions = language === 'en'
    ? [
        'What should I do in my field today?',
        'मेरी फसल में पत्ते पीले हो रहे हैं',
        'How to prevent leaf blight in tomatoes?',
        'बारिश होने वाली है, क्या सिंचाई करनी चाहिए?',
      ]
    : [
        'आज मुझे खेत में क्या करना चाहिए?',
        'मेरी टमाटर की फसल में धब्बे हैं',
        'सिंचाई का सबसे अच्छा समय कब है?',
        'मिट्टी की गुणवत्ता कैसे सुधारें?',
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t('assistant.title')}</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">{t('assistant.subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none px-2 py-1 rounded-lg hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> {t('assistant.clear')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Leaf className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              {language === 'en' ? 'Ask me anything about farming in Hindi or English!' : 'हिंदी या अंग्रेजी में खेती के बारे में कुछ भी पूछें!'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-2 text-xs bg-white border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] hover:bg-primary-50 hover:border-primary-300 transition-colors cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-md'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary-600" />
            </div>
            <div className="bg-white border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('assistant.thinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
        <button
          onClick={toggleVoice}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer border-none ${
            isListening ? 'bg-red-500 text-white animate-pulse-record' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label={t('assistant.voiceButton')}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={t('assistant.placeholder')}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer border-none ${
            input.trim() && !loading ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-label={t('assistant.send')}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
