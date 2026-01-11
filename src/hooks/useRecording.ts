import { useState, useRef, useCallback } from 'react';

export type RecordingSource = 'camera' | 'screen' | 'visualizer';

interface UseRecordingProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const useRecording = ({ canvasRef }: UseRecordingProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSource, setRecordingSource] = useState<RecordingSource>('camera');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const startRecording = useCallback(async (
    source: RecordingSource,
    _inputAnalyser?: AnalyserNode | null,
    _outputAnalyser?: AnalyserNode | null
  ) => {
    try {
      chunksRef.current = [];
      let videoStream: MediaStream | null = null;

      // Get video stream based on source
      if (source === 'camera') {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false // We'll handle audio separately
        });
      } else if (source === 'screen') {
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true // Include system audio if available
        });
      } else if (source === 'visualizer' && canvasRef?.current) {
        // Capture canvas as video stream
        videoStream = canvasRef.current.captureStream(30);
      }

      if (!videoStream) {
        throw new Error('Could not get video stream');
      }

      videoStreamRef.current = videoStream;

      // Create audio context for mixing
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;

      // Get microphone audio for recording
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // If we have system audio from screen share, mix it in
      const screenAudioTracks = videoStream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenAudioStream = new MediaStream(screenAudioTracks);
        const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
        screenSource.connect(destination);
      }

      // Combine video and mixed audio
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        downloadRecording(blob);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingSource(source);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      cleanup();
      throw error;
    }
  }, [canvasRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setRecordingTime(0);
  }, []);

  const downloadRecording = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sovereign-studio-${timestamp}.webm`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Recording saved: ${filename}`);
    console.log('Note: Convert to MP4 using: ffmpeg -i recording.webm -c:v libx264 -c:a aac output.mp4');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingSource,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    startRecording,
    stopRecording
  };
};
