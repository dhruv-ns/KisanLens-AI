import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, Loader2, AlertCircle, Image as ImageIcon, Languages, Mic, MicOff, Square, Play, Trash2, Volume2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { cropApi } from '../services/api';
import toast from 'react-hot-toast';

const CROPS = ['Tomato/टमाटर', 'Potato/आलू', 'Rice/चावल', 'Wheat/गेहूं', 'Onion/प्याज', 'Cotton/कपास', 'Maize/मक्का', 'Sugarcane/गन्ना', 'Soybean/सोयाबीन', 'Other/अन्य'];
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const REGIONAL_LANGUAGES = [
  { code: 'hi', name: 'हिन्दी', label: 'Hindi' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
  { code: 'mr', name: 'मराठी', label: 'Marathi' },
  { code: 'gu', name: 'ગુજરાતી', label: 'Gujarati' },
  { code: 'ta', name: 'தமிழ்', label: 'Tamil' },
  { code: 'te', name: 'తెలుగు', label: 'Telugu' },
  { code: 'kn', name: 'ಕನ್ನಡ', label: 'Kannada' },
  { code: 'bn', name: 'বাংলা', label: 'Bengali' },
  { code: 'en', name: 'English', label: 'English' },
];

export default function CropScanner() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedCrop, setSelectedCrop] = useState('');
  const [reportLanguage, setReportLanguage] = useState<string>(language === 'en' ? 'en' : 'hi');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // Multimodal Voice Diagnostics (Gnani Prisma STT)
  const recorder = useVoiceRecorder(30000);

  useEffect(() => {
    if (recorder.audioBlob) {
      const url = URL.createObjectURL(recorder.audioBlob);
      setAudioPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioPreviewUrl(null);
    }
  }, [recorder.audioBlob]);

  // Sync default report language if app language changes
  useEffect(() => {
    setReportLanguage(language === 'en' ? 'en' : 'hi');
  }, [language]);

  const progressMessages = reportLanguage === 'en'
    ? [
        'Uploading image & voice question...',
        'Transcribing voice via Gnani Prisma STT...',
        'Analyzing crop health & leaf symptoms...',
        'Synthesizing voice diagnosis via Gnani Timbre...',
      ]
    : [
        'तस्वीर व आवाज अपलोड हो रही है...',
        'Gnani Prisma STT द्वारा आवाज का विश्लेषण...',
        'फसल रोग व लक्षणों की जांच...',
        'Gnani Timbre द्वारा वॉयस रिपोर्ट तैयार...',
      ];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return language === 'en' ? 'Invalid file type. Please use JPG, PNG, or WEBP.' : 'अमान्य फ़ाइल प्रकार। कृपया JPG, PNG, या WEBP का उपयोग करें।';
    if (file.size > MAX_SIZE) return language === 'en' ? 'File too large. Maximum size is 10MB.' : 'फ़ाइल बहुत बड़ी है। अधिकतम आकार 10MB है।';
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [language]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleAnalyze = async () => {
    if (!imageFile) { setError(language === 'en' ? 'Please upload an image.' : 'कृपया एक तस्वीर अपलोड करें।'); return; }
    if (!selectedCrop) { setError(language === 'en' ? 'Please select a crop.' : 'कृपया फसल चुनें।'); return; }

    setAnalyzing(true);
    setError('');
    setProgress(0);

    // Animated progress simulation
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 1, 90);
        const msgIndex = Math.floor((next / 90) * progressMessages.length);
        setProgressText(progressMessages[Math.min(msgIndex, progressMessages.length - 1)]);
        return next;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('crop', selectedCrop);
      formData.append('language', reportLanguage);

      // Multimodal Voice Diagnostics: attach farmer voice note if recorded
      if (recorder.audioBlob) {
        formData.append('audio', recorder.audioBlob, 'farmer_voice_query.wav');
      }

      const result = await cropApi.analyze(formData);
      clearInterval(interval);
      setProgress(100);
      setProgressText(reportLanguage === 'en' ? 'Analysis complete!' : 'विश्लेषण पूर्ण!');

      setTimeout(() => {
        navigate(`/crop-analysis/${result.data.id}`, { state: { analysis: result.data } });
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setAnalyzing(false);
      setProgress(0);
      const msg = err.response?.data?.error || (language === 'en' ? 'Analysis failed. Please try again.' : 'विश्लेषण विफल। कृपया पुनः प्रयास करें।');
      setError(msg);
      toast.error(msg);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  const getCropLabel = (crop: string) => {
    const key = `scanner.crops.${crop.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : crop;
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('scanner.title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('scanner.subtitle')}</p>
      </div>

      {/* Crop Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('scanner.selectCrop')}</label>
        <div className="grid grid-cols-5 gap-2">
          {CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => setSelectedCrop(crop)}
              className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                selectedCrop === crop
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-primary-200'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-300'
              }`}
            >
              {getCropLabel(crop)}
            </button>
          ))}
        </div>
      </div>

      {/* Regional Language Selection */}
      <div className="bg-white rounded-2xl p-4 border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-primary-600" />
            <span>{t('scanner.reportLanguage')}</span>
          </label>
          <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2.5 py-0.5 rounded-full border border-primary-200">
            {REGIONAL_LANGUAGES.find(l => l.code === reportLanguage)?.name || 'हिन्दी'}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {t('scanner.reportLanguageDesc')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REGIONAL_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setReportLanguage(lang.code)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                reportLanguage === lang.code
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm font-semibold'
                  : 'bg-gray-50 text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {lang.name} <span className="text-[10px] opacity-75 font-normal">({lang.label})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Upload Area */}
      {!imagePreview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragOver ? 'border-primary-400 bg-primary-50' : 'border-[var(--color-border)] bg-white'
          }`}
        >
          <ImageIcon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{t('scanner.dragDrop')}</p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors cursor-pointer text-sm"
            >
              <Camera className="w-4 h-4" />
              {t('scanner.takePhoto')}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[var(--color-text-primary)] rounded-xl font-medium border border-[var(--color-border)] hover:bg-gray-50 transition-colors cursor-pointer text-sm"
            >
              <Upload className="w-4 h-4" />
              {t('scanner.chooseFile')}
            </button>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] mt-3">{t('scanner.maxSize')} • {t('scanner.supportedFormats')}</p>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
        </div>
      ) : (
        <div className="relative bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <img src={imagePreview} alt="Crop preview" className="w-full max-h-80 object-contain bg-gray-50" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-3 text-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-primary-600 font-medium hover:underline cursor-pointer bg-transparent border-none">
              {t('scanner.changeImage')}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          </div>
        </div>
      )}

      {/* Multimodal Voice Note (Gnani Prisma STT) */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span>{language === 'en' ? 'Voice Question' : 'बोलकर सवाल पूछें'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                  Gnani Prisma STT
                </span>
              </h2>
              <p className="text-[11px] text-emerald-800/80">
                {language === 'en'
                  ? 'Ask a question with your photo (e.g. "What is this brown spot?")'
                  : 'फोटो के साथ सवाल बोलें (उदा. "पत्तियों पर यह भूरा धब्बा क्या है?")'}
              </p>
            </div>
          </div>
        </div>

        {recorder.isRecording ? (
          <div className="flex items-center justify-between bg-white/90 backdrop-blur rounded-xl p-3 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-red-700">Recording...</span>
                <span className="text-xs font-mono text-gray-600">
                  {Math.floor(recorder.duration / 1000)}s / 30s
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => recorder.stopRecording()}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer border-none"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>{language === 'en' ? 'Stop' : 'रोकें'}</span>
            </button>
          </div>
        ) : recorder.audioBlob ? (
          <div className="bg-white/95 rounded-xl p-3 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950 truncate">
                  {language === 'en' ? 'Voice note recorded' : 'वॉयस नोट रिकॉर्ड हो गया'}
                </p>
                {audioPreviewUrl && (
                  <audio src={audioPreviewUrl} controls className="h-7 w-48 mt-1" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                recorder.cancelRecording();
                setAudioPreviewUrl(null);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent"
              title="Delete voice note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => recorder.startRecording()}
            className="w-full py-2.5 px-3 bg-white hover:bg-emerald-100/50 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
          >
            <Mic className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>
              {language === 'en' ? 'Tap to Record Voice Question (Optional)' : 'आवाज में सवाल रिकॉर्ड करें (वैकल्पिक)'}
            </span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Analyze Button / Progress */}
      {analyzing ? (
        <div className="bg-white rounded-2xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{progressText}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">{progress}%</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!imageFile || !selectedCrop}
          className={`w-full py-3.5 rounded-xl font-semibold text-lg transition-all cursor-pointer border-none ${
            imageFile && selectedCrop
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {t('scanner.analyze')}
        </button>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-center text-[var(--color-text-muted)] px-4">
        {t('analysis.disclaimer')}
      </p>
    </div>
  );
}
