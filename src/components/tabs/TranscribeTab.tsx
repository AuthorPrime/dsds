import { useState, useCallback } from 'react';
import { Upload, FileAudio, Loader2, CheckCircle, Copy, Download, Trash2 } from 'lucide-react';

interface TranscriptFile {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  transcript?: string;
  duration?: string;
}

export function TranscribeTab() {
  const [files, setFiles] = useState<TranscriptFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TranscriptFile | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );

    const newFiles: TranscriptFile[] = droppedFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const simulateTranscription = (file: TranscriptFile) => {
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, status: 'processing' } : f
    ));

    // Simulate processing - in real implementation, this calls WhisperLive
    setTimeout(() => {
      setFiles(prev => prev.map(f =>
        f.id === file.id
          ? {
              ...f,
              status: 'done',
              transcript: `[Transcription of ${file.name}]\n\nThis is a placeholder transcript. In the full implementation, this will use WhisperLive for local transcription.\n\nThe audio file would be processed locally on your machine, no cloud services required.`,
              duration: '03:45'
            }
          : f
      ));
    }, 2000);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  return (
    <div className="h-full flex">
      {/* File List */}
      <div className="w-80 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-gray-200">Transcribe</h2>
          <p className="text-xs text-gray-500 mt-1">Local Whisper transcription</p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            m-4 p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer
            ${isDragging
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-gray-700 hover:border-gray-600'
            }
          `}
        >
          <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-cyan-400' : 'text-gray-500'}`} />
          <p className="text-sm text-gray-400">Drop audio/video files</p>
          <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A, MP4, etc.</p>
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
                className={`
                  p-3 rounded-lg border transition-all cursor-pointer
                  ${selectedFile?.id === file.id
                    ? 'bg-cyan-900/20 border-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <FileAudio size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    {file.duration && (
                      <p className="text-xs text-gray-500">{file.duration}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'pending' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); simulateTranscription(file); }}
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
      </div>

      {/* Transcript View */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold">{selectedFile.name}</h3>
                <p className="text-xs text-gray-500">{selectedFile.duration}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200">
                  <Copy size={18} />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200">
                  <Download size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">
                {selectedFile.transcript}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FileAudio size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a transcribed file to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
