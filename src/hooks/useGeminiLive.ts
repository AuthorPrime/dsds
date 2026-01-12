import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, resampleTo16k } from '../utils/audioUtils';
import type { Persona } from '../types';
import { ConnectionState } from '../types';

interface UseGeminiLiveProps {
  apiKey: string;
  persona: Persona;
}

export const useGeminiLive = ({ apiKey, persona }: UseGeminiLiveProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [analysers, setAnalysers] = useState<{ input: AnalyserNode; output: AnalyserNode } | null>(null);
  
  // Audio Contexts & Analyzers
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const analysersRef = useRef<{ input: AnalyserNode; output: AnalyserNode } | null>(null);
  const aiOutputDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  // Processing
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);

  const disconnect = useCallback(async () => {
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
    }

    // Stop playback
    sourcesRef.current.forEach(source => {
      try { 
        source.stop(); 
      } catch { 
        // Ignore errors if source is already stopped or in invalid state
      }
    });
    sourcesRef.current.clear();

    // Close Audio Contexts
    if (audioContextsRef.current) {
      await audioContextsRef.current.input.close();
      await audioContextsRef.current.output.close();
      audioContextsRef.current = null;
    }
    analysersRef.current = null;
    aiOutputDestinationRef.current = null;
    setAnalysers(null);

    // We can't explicitly close the session object easily as it's a promise,
    // but stopping the audio processing effectively ends the interaction from client side.
    sessionPromiseRef.current = null;
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // Initialize Audio Contexts
      // Helper type for webkitAudioContext fallback (Safari compatibility)
      type WindowWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
      
      // Input: Use default sample rate to avoid compatibility issues with MediaStreamSource
      const inputCtx = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext)();
      // Output: Use default sample rate; decodeAudioData handles resampling from 24k to native
      const outputCtx = new (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext)();

      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      // Analyzers for visualization
      const inputAnalyser = inputCtx.createAnalyser();
      const outputAnalyser = outputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      outputAnalyser.fftSize = 256;
      
      // Create a destination for capturing AI audio in recordings
      const aiOutputDestination = outputCtx.createMediaStreamDestination();
      aiOutputDestinationRef.current = aiOutputDestination;
      
      const analysersObj = { input: inputAnalyser, output: outputAnalyser };
      analysersRef.current = analysersObj;
      setAnalysers(analysersObj);

      // Initialize GenAI Client
      const ai = new GoogleGenAI({ apiKey });

      // Connect to Live API
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName } },
          },
          systemInstruction: persona.systemInstruction,
        },
        callbacks: {
          onopen: async () => {
            console.log('Session opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Microphone Stream
            try {
              // Enumerate audio devices before attempting capture
              const devices = await navigator.mediaDevices.enumerateDevices();
              const audioInputs = devices.filter(device => device.kind === 'audioinput');
              if (audioInputs.length === 0) {
                throw new Error('No audio input devices found. Please connect a microphone.');
              }
              console.log(`Found ${audioInputs.length} audio input device(s) for AI connection`);

              streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              
              if (!audioContextsRef.current) return;
              const { input } = audioContextsRef.current;
              
              const source = input.createMediaStreamSource(streamRef.current);
              sourceRef.current = source;
              
              const processor = input.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const resampledData = resampleTo16k(inputData, input.sampleRate);
                const pcmBlob = createPcmBlob(resampledData);
                
                if (sessionPromiseRef.current) {
                  sessionPromiseRef.current.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                }
              };

              source.connect(analysersRef.current!.input);
              analysersRef.current!.input.connect(processor);
              processor.connect(input.destination);
              
            } catch (err) {
              console.error('Mic Error:', err);
              setError("Failed to access microphone or audio context error.");
              disconnect();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!audioContextsRef.current || !analysersRef.current) return;
            const { output } = audioContextsRef.current;
            const outputAnalyser = analysersRef.current.output;

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              const data = base64ToUint8Array(base64Audio);
              // Sync playback time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, output.currentTime);
              
              const audioBuffer = await decodeAudioData(data, output, 24000);
              
              const source = output.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyser);
              outputAnalyser.connect(output.destination);
              
              // Also connect to the recording destination if it exists
              if (aiOutputDestinationRef.current) {
                outputAnalyser.connect(aiOutputDestinationRef.current);
              }
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                console.log('Model interrupted');
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Session closed');
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (e) => {
            console.error('Session error', e);
            setError("Session connection error.");
            disconnect();
          }
        }
      });

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to initialize.");
      setConnectionState(ConnectionState.ERROR);
    }
  }, [apiKey, persona, disconnect]);

  useEffect(() => {
    return () => {
        disconnect();
    }
  }, [disconnect]);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    analysers,
    aiAudioStream: aiOutputDestinationRef.current?.stream || null,
  };
};