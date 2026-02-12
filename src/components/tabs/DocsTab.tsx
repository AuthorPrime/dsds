import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Copy, Check, Download } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdown';
import { saveFile, saveBlob } from '../../services/fileManager';

interface DocFile {
  id: string;
  name: string;
  type: 'pdf' | 'md' | 'txt';
  content: string;      // raw text content (md/txt) or object URL (pdf)
  objectUrl?: string;    // blob URL for PDFs
}

export function DocsTab() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); });
    };
  }, [files]);

  // Reset page when selecting a new file
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setLoading(true);
    // Small delay to let render settle
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [selectedFile?.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.md') || f.name.endsWith('.txt')
    );

    droppedFiles.forEach(async (file) => {
      const type = file.name.endsWith('.pdf') ? 'pdf' as const
        : file.name.endsWith('.md') ? 'md' as const
        : 'txt' as const;

      const id = crypto.randomUUID();

      if (type === 'pdf') {
        const objectUrl = URL.createObjectURL(file);
        const newFile: DocFile = { id, name: file.name, type, content: '', objectUrl };
        setFiles(prev => [...prev, newFile]);
      } else {
        const text = await file.text();
        const newFile: DocFile = { id, name: file.name, type, content: text };
        setFiles(prev => [...prev, newFile]);
      }
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.objectUrl) URL.revokeObjectURL(file.objectUrl);
      return prev.filter(f => f.id !== id);
    });
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  const handleCopyContent = () => {
    if (!selectedFile || selectedFile.type === 'pdf') return;
    navigator.clipboard.writeText(selectedFile.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    if (selectedFile.type === 'pdf' && selectedFile.objectUrl) {
      // PDFs: fetch the blob from the object URL and save
      try {
        const response = await fetch(selectedFile.objectUrl);
        const blob = await response.blob();
        await saveBlob('publications', selectedFile.name, blob);
      } catch {
        // Fallback: direct download
        const a = document.createElement('a');
        a.href = selectedFile.objectUrl;
        a.download = selectedFile.name;
        a.click();
      }
    } else {
      await saveFile('publications', selectedFile.name, selectedFile.content);
    }
  };

  // Render the document content based on type
  const renderContent = () => {
    if (!selectedFile) return null;

    if (selectedFile.type === 'pdf') {
      return (
        <div className="w-full h-full overflow-auto">
          <iframe
            ref={iframeRef}
            src={`${selectedFile.objectUrl}#page=${currentPage}`}
            className="border-0"
            title={selectedFile.name}
            style={{
              width: `${zoom}%`,
              height: `${zoom}%`,
              minWidth: '100%',
              minHeight: '100%',
            }}
          />
        </div>
      );
    }

    if (selectedFile.type === 'md') {
      return (
        <div
          className="bg-white text-gray-900 p-8 shadow-2xl max-w-4xl mx-auto rounded"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', minWidth: '612px' }}
        >
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFile.content, 'light') }}
          />
        </div>
      );
    }

    // Plain text
    return (
      <div
        className="bg-white text-gray-900 p-8 shadow-2xl max-w-4xl mx-auto rounded"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', minWidth: '612px' }}
      >
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{selectedFile.content}</pre>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* File List Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-gray-200">Documents</h2>
          <p className="text-xs text-gray-500 mt-1">PDF, Markdown & Text viewer</p>
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
          <p className="text-sm text-gray-400">Drop documents</p>
          <p className="text-xs text-gray-600 mt-1">PDF, MD, TXT</p>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {files.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No documents yet</p>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`
                  p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3
                  ${selectedFile?.id === file.id
                    ? 'bg-cyan-900/20 border-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <FileText size={16} className={`flex-shrink-0 ${
                  file.type === 'pdf' ? 'text-red-400' :
                  file.type === 'md' ? 'text-blue-400' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{file.name}</span>
                  <span className="text-xs text-gray-600 uppercase">{file.type}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 flex flex-col bg-gray-950">
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setZoom(z => Math.max(50, z - 10))}>
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm text-gray-400 w-16 text-center">{zoom}%</span>
                <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setZoom(z => Math.min(200, z + 10))}>
                  <ZoomIn size={18} />
                </button>
              </div>

              {selectedFile.type === 'pdf' && (
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {selectedFile.type !== 'pdf' && (
                  <button
                    onClick={handleCopyContent}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1.5"
                    title="Copy content"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1.5"
                  title="Download file"
                >
                  <Download size={14} /> Save
                </button>
              </div>
            </div>

            {/* Viewer Area */}
            <div className={`flex-1 overflow-auto relative ${selectedFile.type === 'pdf' ? '' : 'p-8'}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading document...</p>
                  </div>
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FileText size={64} className="mx-auto mb-4 opacity-50" />
              <p>Select a document to view</p>
              <p className="text-sm mt-2">or drop files to add them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
