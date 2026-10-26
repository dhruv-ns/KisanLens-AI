import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export interface UseVoiceRecorderReturn extends VoiceRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isSupported: boolean;
}

/**
 * Downsample Float32Array audio buffer to 16000 Hz using box-averaging anti-aliasing.
 */
function downsampleBuffer(buffer: Float32Array, inSampleRate: number, outSampleRate = 16000): Float32Array {
  if (inSampleRate === outSampleRate || inSampleRate < outSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inSampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer];
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Encode Float32Array PCM samples into a standard 16-bit mono 16kHz WAV file.
 */
function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bitDepth = 16;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // "RIFF" chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);          // Subchunk1Size
  view.setUint16(20, 1, true);           // Linear PCM
  view.setUint16(22, numChannels, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Custom hook for audio recording.
 * Records clean, standard 16kHz 16-bit mono WAV audio for direct compatibility with Gnani Prisma v2.5 STT.
 */
export function useVoiceRecorder(maxDurationMs = 60000): UseVoiceRecorderReturn {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    error: null,
  });

  const isRecordingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sampleRateRef = useRef<number>(16000);

  const isSupported = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined');

  const cleanup = useCallback(() => {
    isRecordingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch { /* ignore */ }
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch { /* ignore */ }
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({ ...prev, error: 'Audio recording is not supported in this browser.' }));
      return;
    }

    try {
      cleanup();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate || 44100;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      samplesRef.current = [];
      isRecordingRef.current = true;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(inputData));
      };

      // Mute gain node: keeps processor active in Web Audio pipeline without echoing mic back into speakers!
      const muteNode = audioCtx.createGain();
      muteNode.gain.value = 0;

      source.connect(processor);
      processor.connect(muteNode);
      muteNode.connect(audioCtx.destination);

      startTimeRef.current = Date.now();
      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        error: null,
      });

      // Update duration every 200ms
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setState(prev => ({ ...prev, duration: Math.floor(elapsed / 1000) }));
      }, 200);

      // Auto-stop at max duration
      maxTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          stopRecording();
        }
      }, maxDurationMs);

    } catch (err: any) {
      cleanup();
      let errorMessage = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone detected. Please connect a microphone.';
      }
      setState(prev => ({ ...prev, isRecording: false, error: errorMessage }));
    }
  }, [isSupported, maxDurationMs, cleanup]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    // Flatten collected Float32 chunks
    const chunks = samplesRef.current;
    let totalLength = 0;
    for (let i = 0; i < chunks.length; i++) {
      totalLength += chunks[i].length;
    }

    // Minimum samples required (>0.2s of audio)
    const nativeSampleRate = sampleRateRef.current || 44100;
    if (totalLength < nativeSampleRate * 0.2) {
      cleanup();
      setState(prev => ({
        ...prev,
        isRecording: false,
        audioBlob: null,
      }));
      return;
    }

    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      mergedSamples.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    // Downsample from native device rate (44.1k/48k) to standard 16kHz
    const downsampledSamples = downsampleBuffer(mergedSamples, nativeSampleRate, 16000);

    // Encode to standard 16-bit mono 16kHz WAV
    const wavBlob = encodeWAV(downsampledSamples, 16000);

    cleanup();

    setState(prev => ({
      ...prev,
      isRecording: false,
      audioBlob: wavBlob,
    }));
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      error: null,
    });
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
  };
}
