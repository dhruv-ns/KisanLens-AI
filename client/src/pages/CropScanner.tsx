import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cropApi } from '../services/api';
import toast from 'react-hot-toast';

const CROPS = ['Tomato', 'Potato', 'Rice', 'Wheat', 'Onion', 'Cotton', 'Maize', 'Sugarcane', 'Soybean', 'Other'];
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CropScanner() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedCrop, setSelectedCrop] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const progressMessages = language === 'en'
    ? ['Uploading image...', 'Examining visible symptoms...', 'Analyzing crop health...', 'Preparing recommendations...']
    : ['तस्वीर अपलोड हो रही है...', 'दृश्य लक्षणों की जांच...', 'फसल स्वास्थ्य का विश्लेषण...', 'सिफारिशें तैयार हो रही हैं...'];

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

      const result = await cropApi.analyze(formData);
      clearInterval(interval);
      setProgress(100);
      setProgressText(language === 'en' ? 'Analysis complete!' : 'विश्लेषण पूर्ण!');

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
              onClick={() => setSelectedCrop(crop)}
              className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                selectedCrop === crop
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-300'
              }`}
            >
              {getCropLabel(crop)}
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
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors cursor-pointer text-sm"
            >
              <Camera className="w-4 h-4" />
              {t('scanner.takePhoto')}
            </button>
            <button
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
            onClick={clearImage}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-3 text-center">
            <button onClick={() => fileInputRef.current?.click()} className="text-sm text-primary-600 font-medium hover:underline cursor-pointer bg-transparent border-none">
              {t('scanner.changeImage')}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          </div>
        </div>
      )}

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
