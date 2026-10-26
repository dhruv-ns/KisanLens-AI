import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  progress: number;
  duration: number;
  error: string | null;
}

export interface UseAudioPlayerReturn extends AudioPlayerState {
  play: (audioSrc: string | Blob, fallbackText?: string, lang?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  speakBrowser: (text: string, lang?: string) => void;
  stopBrowserSpeech: () => void;
  isBrowserSpeaking: boolean;
}

/**
 * Ensures audio buffer has a 44-byte RIFF/WAV header.
 * Converts raw 16-bit mono PCM into standard browser-playable WAV.
 */
function ensureWavHeader(buffer: ArrayBuffer, sampleRate = 24000): ArrayBuffer {
  const bytes = new Uint8Array(buffer);

  // If already starts with "RIFF", it's already a valid WAV container
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46    // 'F'
  ) {
    return buffer;
  }

  const numChannels = 1;
  const bitDepth = 16;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = bytes.length;
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);

  // "RIFF" chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);          // Subchunk1Size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Copy raw PCM samples
  new Uint8Array(wavBuffer, headerSize).set(bytes);
  return wavBuffer;
}

/**
 * Custom hook for audio playback with controls.
 * Supports both Gnani AI TTS audio and browser-native SpeechSynthesis fallback.
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    progress: 0,
    duration: 0,
    error: null,
  });
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudio]);

  const updateProgress = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      setState(prev => ({
        ...prev,
        progress: audioRef.current!.currentTime,
        duration: audioRef.current!.duration || 0,
      }));
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // ── Browser SpeechSynthesis Fallback ──
  const speakBrowser = useCallback((text: string, lang = 'hi-IN') => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*_#`~[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const isHindi = lang.startsWith('hi');
    const matchingVoice = voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi')) ||
      voices.find(v => v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी'));

    // Critical: Never let an English voice read Hindi text, as it skips Devanagari and only reads Latin words
    if (isHindi && !matchingVoice) {
      console.warn('No native Hindi voice available in browser speech synthesis.');
      setState(prev => ({ ...prev, isPlaying: false, error: null }));
      return;
    }

    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => {
      setIsBrowserSpeaking(true);
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false, error: null }));
    };
    utterance.onend = () => {
      setIsBrowserSpeaking(false);
      setState(prev => ({ ...prev, isPlaying: false }));
    };
    utterance.onerror = () => {
      setIsBrowserSpeaking(false);
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopBrowserSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsBrowserSpeaking(false);
    }
  }, []);

  // ── Play Audio Source with Fallback ──
  const play = useCallback(async (audioSrc: string | Blob, fallbackText?: string, lang = 'hi-IN') => {
    cleanupAudio();
    stopBrowserSpeech();

    try {
      let finalSrc: string;

      if (audioSrc instanceof Blob) {
        const arrayBuf = await audioSrc.arrayBuffer();
        const wavBuf = ensureWavHeader(arrayBuf, 24000);
        const wavBlob = new Blob([wavBuf], { type: 'audio/wav' });
        const url = URL.createObjectURL(wavBlob);
        objectUrlRef.current = url;
        finalSrc = url;
      } else {
        finalSrc = audioSrc;
      }

      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = 'auto';
      audio.src = finalSrc;

      audio.onloadedmetadata = () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration,
          isPlaying: true,
          isPaused: false,
          progress: 0,
          error: null,
        }));
      };

      audio.onended = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          progress: 0,
        }));
        cleanupAudio();
      };

      audio.onerror = (e) => {
        console.warn('Audio element error, falling back:', e);
        cleanupAudio();
        if (fallbackText) {
          speakBrowser(fallbackText, lang);
        } else {
          setState(prev => ({ ...prev, isPlaying: false, error: 'Audio playback failed.' }));
        }
      };

      await audio.play();
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false, error: null }));
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } catch (err: any) {
      cleanupAudio();
      if (err.name === 'NotAllowedError') {
        // Autoplay blocked by browser policy without recent user click
        console.warn('Browser blocked autoplay. User can click Listen to play.');
        setState(prev => ({ ...prev, isPlaying: false, error: null }));
        return;
      }
      console.warn('Audio play() failed, trying speech fallback:', err.message);
      if (fallbackText) {
        speakBrowser(fallbackText, lang);
      } else {
        setState(prev => ({ ...prev, isPlaying: false, error: 'Failed to play audio.' }));
      }
    }
  }, [cleanupAudio, speakBrowser, stopBrowserSpeech, updateProgress]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
        animFrameRef.current = requestAnimationFrame(updateProgress);
      });
    }
  }, [updateProgress]);

  const stop = useCallback(() => {
    cleanupAudio();
    stopBrowserSpeech();
    setState({
      isPlaying: false,
      isPaused: false,
      progress: 0,
      duration: 0,
      error: null,
    });
  }, [cleanupAudio, stopBrowserSpeech]);

  return {
    ...state,
    play,
    pause,
    resume,
    stop,
    speakBrowser,
    stopBrowserSpeech,
    isBrowserSpeaking,
  };
}
