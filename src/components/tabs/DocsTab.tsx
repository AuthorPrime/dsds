import { useState, useCallback } from 'react';
import { Upload, FileText, Trash2, Eye, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface DocFile {
  id: string;
  name: string;
  path: string;
  type: 'pdf' | 'md' | 'txt';
}

export function DocsTab() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.md') || f.name.endsWith('.txt')
    );

    const newFiles: DocFile[] = droppedFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      path: f.name, // In real implementation, use actual path
      type: f.name.endsWith('.pdf') ? 'pdf' : f.name.endsWith('.md') ? 'md' : 'txt',
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

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  return (
    <div className="h-full flex">
      {/* File List Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-gray-200">Documents</h2>
          <p className="text-xs text-gray-500 mt-1">PDF viewer & editor</p>
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
                <span className="flex-1 text-sm truncate">{file.name}</span>
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

              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                Open External
              </button>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
              <div
                className="bg-white text-black p-8 shadow-2xl"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  minWidth: '612px', // Letter width in pixels at 72 DPI
                  minHeight: '792px', // Letter height
                }}
              >
                <div className="text-center text-gray-400 py-32">
                  <Eye size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Document preview</p>
                  <p className="text-sm mt-2">{selectedFile.name}</p>
                  <p className="text-xs mt-4">Full PDF rendering coming soon</p>
                </div>
              </div>
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
