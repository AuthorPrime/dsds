/**
 * Transcribe Tab - File & Live Transcription
 * Supports Whisper.cpp server for file transcription
 * and Web Speech API for live mic transcription
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileAudio, Loader2, CheckCircle, Copy, Download, Trash2,
  Mic, MicOff, AlertCircle,
} from 'lucide-react';
import { getSettings } from '../../hooks/useSettings';

interface TranscriptFile {
  id: string;
  name: string;
  file?: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  transcript?: string;
  duration?: string;
  errorMsg?: string;
}

export function TranscribeTab() {
  const [settings] = useState(() => getSettings());
  const [files, setFiles] = useState<TranscriptFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TranscriptFile | null>(null);

  // Live transcription state
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );

    const newFiles: TranscriptFile[] = droppedFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      file: f,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: TranscriptFile[] = Array.from(selected)
      .filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'))
      .map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        file: f,
        status: 'pending',
      }));

    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Transcribe file via Whisper.cpp server
  const transcribeFile = useCallback(async (file: TranscriptFile) => {
    if (!file.file) return;

    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, status: 'processing' } : f
    ));

    // Determine endpoint based on STT provider
    let endpoint = 'http://localhost:8080';
    if (settings.sttProvider === 'whispercpp') {
      endpoint = 'http://localhost:8080';
    } else if (settings.sttProvider === 'faster_whisper') {
      endpoint = 'http://localhost:8080';
    }

    try {
      const formData = new FormData();
      formData.append('file', file.file);
      if (settings.sttModel) {
        formData.append('model', settings.sttModel);
      }
      formData.append('response_format', 'text');

      const res = await fetch(`${endpoint}/inference`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(300000), // 5 min timeout for large files
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const transcript = await res.text();

      setFiles(prev => prev.map(f =>
        f.id === file.id
          ? { ...f, status: 'done', transcript: transcript.trim() }
          : f
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setFiles(prev => prev.map(f =>
        f.id === file.id
          ? { ...f, status: 'error', errorMsg: msg }
          : f
      ));
    }
  }, [settings.sttProvider, settings.sttModel]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  const copyTranscript = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const downloadTranscript = (name: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/\.[^.]+$/, '') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live transcription via Web Speech API
  const toggleLiveTranscription = useCallback(() => {
    if (isLiveTranscribing) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsLiveTranscribing(false);
      setInterimText('');
      return;
    }

    // Start
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setLiveTranscript(prev => prev + result[0].transcript + ' ');
          setInterimText('');
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      const errorType = event.error || 'unknown';
      if (errorType === 'no-speech') return; // Normal during pauses
      if (errorType === 'aborted') return;
      console.error('Speech recognition error:', errorType);
      setSpeechError(`Speech recognition error: ${errorType}`);
    };

    recognition.onend = () => {
      // Auto-restart if still in live mode
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsLiveTranscribing(true);
  }, [isLiveTranscribing]);

  const isWhisperMode = settings.sttProvider !== 'web_speech';

  return (
    <div className="h-full flex">
      {/* File List Sidebar */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Transcribe
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isWhisperMode
              ? `File transcription (${settings.sttProvider})`
              : 'Live mic transcription (Web Speech API)'}
          </p>
        </div>

        {/* Live Transcribe Button */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => { setSpeechError(null); toggleLiveTranscription(); }}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isLiveTranscribing
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02]'
            }`}
          >
            {isLiveTranscribing ? <><MicOff size={16} /> Stop Live</> : <><Mic size={16} /> Live Transcribe</>}
          </button>
          {speechError && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{speechError}</p>
            </div>
          )}
        </div>

        {/* Drop Zone for file upload */}
        {isWhisperMode && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`m-4 p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-cyan-400' : 'text-gray-500'}`} />
              <p className="text-sm text-gray-400">Drop audio/video files</p>
              <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A, MP4</p>
              <label className="mt-3 inline-block text-xs text-cyan-400 cursor-pointer hover:underline">
                or browse files
                <input type="file" accept="audio/*,video/*" multiple onChange={handleFileInput} className="hidden" />
              </label>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {files.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-8">No files yet</p>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => file.status === 'done' && setSelectedFile(file)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedFile?.id === file.id
                        ? 'bg-cyan-900/20 border-cyan-500/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileAudio size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        {file.status === 'error' && (
                          <p className="text-xs text-red-400 truncate">{file.errorMsg}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); transcribeFile(file); }}
                            className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white"
                          >
                            Start
                          </button>
                        )}
                        {file.status === 'processing' && (
                          <Loader2 size={16} className="text-cyan-400 animate-spin" />
                        )}
                        {file.status === 'done' && (
                          <CheckCircle size={16} className="text-green-400" />
                        )}
                        {file.status === 'error' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); transcribeFile(file); }}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Web Speech mode hint */}
        {!isWhisperMode && (
          <div className="p-4 flex-1">
            <p className="text-xs text-slate-500">
              Web Speech API uses your browser's built-in speech recognition.
              For file transcription, switch to Whisper.cpp in Settings.
            </p>
          </div>
        )}
      </div>

      {/* Transcript View */}
      <div className="flex-1 flex flex-col">
        {/* Live transcript view */}
        {isLiveTranscribing || liveTranscript ? (
          <>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-200">Live Transcript</h3>
                <p className="text-xs text-slate-500">
                  {isLiveTranscribing ? 'Listening...' : 'Session ended'}
                </p>
              </div>
              <div className="flex gap-2">
                {liveTranscript && (
                  <>
                    <button
                      onClick={() => copyTranscript(liveTranscript)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200"
                      title="Copy"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => downloadTranscript('live-transcript', liveTranscript)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => { setLiveTranscript(''); setInterimText(''); }}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400"
                      title="Clear"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                {liveTranscript}
                {interimText && <span className="text-slate-500 italic">{interimText}</span>}
              </p>
              {isLiveTranscribing && !liveTranscript && !interimText && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Waiting for speech...</span>
                </div>
              )}
            </div>
          </>
        ) : selectedFile ? (
          <>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-200">{selectedFile.name}</h3>
                {selectedFile.duration && <p className="text-xs text-slate-500">{selectedFile.duration}</p>}
              </div>
              <div className="flex gap-2">
                {selectedFile.transcript && (
                  <>
                    <button
                      onClick={() => copyTranscript(selectedFile.transcript!)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200"
                      title="Copy"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => downloadTranscript(selectedFile.name, selectedFile.transcript!)}
                      className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed">
                {selectedFile.transcript}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FileAudio size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a transcribed file or start live transcription</p>
              {!isWhisperMode && (
                <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                  Click "Live Transcribe" to start real-time speech-to-text using your microphone
                </p>
              )}
              {isWhisperMode && (
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg inline-block">
                  <p className="text-xs text-amber-400 flex items-center gap-2">
                    <AlertCircle size={14} />
                    Whisper.cpp must be running on localhost:8080
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
