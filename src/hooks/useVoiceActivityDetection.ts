import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface VADConfig {
  silenceThreshold: number;      // dB level below which is considered silence
  silenceDuration: number;       // ms of silence before triggering AI
  minSpeechDuration: number;     // ms of speech needed to reset silence timer
}

interface UseVADProps {
  onSilenceDetected: () => void;
  onSpeechDetected: () => void;
  config?: Partial<VADConfig>;
}

const DEFAULT_CONFIG: VADConfig = {
  silenceThreshold: -50,         // dB
  silenceDuration: 2000,         // 2 seconds of silence triggers AI
  minSpeechDuration: 300,        // 300ms of speech to reset
};

export const useVoiceActivityDetection = ({
  onSilenceDetected,
  onSpeechDetected,
  config = {}
}: UseVADProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceTime, setSilenceTime] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);

  const settings = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const calculateDecibels = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const db = 20 * Math.log10(rms + 0.0001);
    return db;
  }, []);

  useEffect(() => {
    if (!isListening) return;

    const processAudio = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(dataArray);

      const db = calculateDecibels(dataArray);
      const now = Date.now();

      if (db > settings.silenceThreshold) {
        // Speech detected
        if (!speechStartRef.current) {
          speechStartRef.current = now;
        }

        // If speech has been going long enough, reset silence timer
        if (now - speechStartRef.current > settings.minSpeechDuration) {
          if (!isSpeaking) {
            setIsSpeaking(true);
            onSpeechDetected();
          }
          silenceStartRef.current = null;
          setSilenceTime(0);
        }
      } else {
        // Silence detected
        speechStartRef.current = null;

        if (!silenceStartRef.current) {
          silenceStartRef.current = now;
        }

        const currentSilence = now - silenceStartRef.current;
        setSilenceTime(currentSilence);

        if (currentSilence >= settings.silenceDuration && isSpeaking) {
          setIsSpeaking(false);
          onSilenceDetected();
          silenceStartRef.current = now; // Reset to prevent repeated triggers
        }
      }

      animationFrameRef.current = requestAnimationFrame(processAudio);
    };

    processAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, calculateDecibels, settings, isSpeaking, onSilenceDetected, onSpeechDetected]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 512;
      analyserRef.current = analyserNode;
      setAnalyser(analyserNode);

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserNode);

      setIsListening(true);
    } catch (error) {
      console.error('Failed to start VAD:', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    setIsListening(false);
    setIsSpeaking(false);
    setSilenceTime(0);
    setAnalyser(null);
    silenceStartRef.current = null;
    speechStartRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isSpeaking,
    silenceTime,
    silenceProgress: Math.min(silenceTime / settings.silenceDuration, 1),
    startListening,
    stopListening,
    analyser
  };
};
