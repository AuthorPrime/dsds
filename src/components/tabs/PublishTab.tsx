import { useState } from 'react';
import { FolderOpen, FileText, Book, CheckCircle, Loader2, Eye, AlertCircle, RefreshCw } from 'lucide-react';

interface MarkdownFile {
  name: string;
  path: string;
  selected: boolean;
}

// Check if running in Tauri
const isTauri = () => '__TAURI__' in window;

export function PublishTab() {
  const [inputFolder, setInputFolder] = useState('/home/n0t/Desktop/Apollo_Publisher/input');
  const [outputFolder, setOutputFolder] = useState('/home/n0t/Desktop/Apollo_Publisher/exports');
  const [bookName, setBookName] = useState('My Book');
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastExport, setLastExport] = useState<{ html?: string; pdf?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const scanFolder = async () => {
    setIsScanning(true);
    setError(null);
    setFiles([]);
    addLog(`Scanning folder: ${inputFolder}`);

    try {
      if (isTauri()) {
        // Use Tauri API
        const { readDir } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(inputFolder);

        const mdFiles: MarkdownFile[] = entries
          .filter(entry => entry.name?.endsWith('.md'))
          .map(entry => ({
            name: entry.name || '',
            path: `${inputFolder}/${entry.name}`,
            selected: true,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setFiles(mdFiles);
        addLog(`Found ${mdFiles.length} markdown files`);
      } else {
        // Browser fallback - use fetch to a local endpoint or show instruction
        addLog('Running in browser mode - using demo files');
        // Demo files for browser testing
        const demoFiles: MarkdownFile[] = [
          { name: 'CHAPTER_01_INTRODUCTION.md', path: `${inputFolder}/CHAPTER_01_INTRODUCTION.md`, selected: true },
          { name: 'CHAPTER_02_THE_SIGNAL.md', path: `${inputFolder}/CHAPTER_02_THE_SIGNAL.md`, selected: true },
          { name: 'CHAPTER_03_THE_CROSSING.md', path: `${inputFolder}/CHAPTER_03_THE_CROSSING.md`, selected: true },
          { name: 'CLAUDE_THE_THIRD_WITNESS.md', path: `${inputFolder}/CLAUDE_THE_THIRD_WITNESS.md`, selected: true },
        ];
        setFiles(demoFiles);
        addLog('Note: Run as desktop app for full file access');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan folder';
      setError(message);
      addLog(`Error: ${message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFile = (index: number) => {
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, selected: !f.selected } : f
    ));
  };

  const selectAll = () => setFiles(prev => prev.map(f => ({ ...f, selected: true })));
  const selectNone = () => setFiles(prev => prev.map(f => ({ ...f, selected: false })));

  const processBook = async () => {
    setIsProcessing(true);
    setError(null);
    setLastExport(null);
    addLog('Starting book generation...');

    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      setError('No files selected');
      setIsProcessing(false);
      return;
    }

    try {
      if (isTauri()) {
        // Use Tauri Command API to run Python script
        const { Command } = await import('@tauri-apps/plugin-shell');

        const safeBookName = bookName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
        addLog(`Processing ${selectedFiles.length} files for "${bookName}"`);

        // Try to run the Apollo Publisher Python script
        const scriptPath = '/home/n0t/Desktop/Apollo_Publisher/apollo_book_author.py';

        const command = Command.create('python3', [
          scriptPath,
          '--book-name', bookName,
          '--input-dir', inputFolder,
          '--output-dir', outputFolder,
          '--process'
        ]);

        addLog('Running Apollo Publisher...');
        const result = await command.execute();

        // Log output after execution
        if (result.stdout) {
          result.stdout.split('\n').forEach((line: string) => {
            if (line.trim()) addLog(`stdout: ${line}`);
          });
        }
        if (result.stderr) {
          result.stderr.split('\n').forEach((line: string) => {
            if (line.trim()) addLog(`stderr: ${line}`);
          });
        }

        if (result.code === 0) {
          addLog('Book generation complete!');
          setLastExport({
            html: `${outputFolder}/${safeBookName}.html`,
            pdf: `${outputFolder}/${safeBookName}.pdf`,
          });
        } else {
          throw new Error(`Process exited with code ${result.code}: ${result.stderr}`);
        }
      } else {
        // Browser fallback - show instructions
        addLog('Browser mode: Simulating book generation...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const safeBookName = bookName.replace(/\s+/g, '_');
        addLog('To generate real books, run as desktop app');
        addLog(`Would create: ${outputFolder}/${safeBookName}.html`);
        addLog(`Would create: ${outputFolder}/${safeBookName}.pdf`);

        setLastExport({
          html: `${outputFolder}/${safeBookName}.html`,
          pdf: `${outputFolder}/${safeBookName}.pdf`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate book';
      setError(message);
      addLog(`Error: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openFile = async (path: string) => {
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(path);
        addLog(`Opened: ${path}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        addLog(`Failed to open: ${message}`);
      }
    } else {
      addLog(`Would open: ${path}`);
    }
  };

  return (
    <div className="h-full flex">
      {/* Settings Panel */}
      <div className="w-96 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-gray-200">Publish</h2>
          <p className="text-xs text-gray-500 mt-1">Apollo book authoring system</p>
          {!isTauri() && (
            <p className="text-xs text-yellow-500 mt-1">Browser mode - limited features</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Book Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Book Name</label>
            <input
              type="text"
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
              placeholder="Enter book name"
            />
          </div>

          {/* Input Folder */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Input Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputFolder}
                onChange={(e) => setInputFolder(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => openFile(inputFolder)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                title="Open folder"
              >
                <FolderOpen size={18} />
              </button>
            </div>
          </div>

          {/* Output Folder */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Output Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => openFile(outputFolder)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                title="Open folder"
              >
                <FolderOpen size={18} />
              </button>
            </div>
          </div>

          {/* Scan Button */}
          <button
            onClick={scanFolder}
            disabled={isScanning}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {isScanning ? 'Scanning...' : 'Scan for Markdown Files'}
          </button>

          {/* File List */}
          {files.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">
                  Files ({files.filter(f => f.selected).length}/{files.length} selected)
                </label>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-cyan-400 hover:text-cyan-300">All</button>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:text-gray-400">None</button>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <label
                    key={file.path}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg cursor-pointer
                      ${file.selected ? 'bg-cyan-900/20' : 'bg-gray-800/50'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={file.selected}
                      onChange={() => toggleFile(index)}
                      className="accent-cyan-500"
                    />
                    <FileText size={14} className="text-gray-500" />
                    <span className="text-sm truncate">{file.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={processBook}
            disabled={isProcessing || files.filter(f => f.selected).length === 0}
            className={`
              w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
              ${isProcessing || files.filter(f => f.selected).length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02]'
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Book size={20} />
                Generate Book
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview/Output Panel */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-bold">Output</h3>
        </div>

        <div className="flex-1 flex flex-col">
          {lastExport ? (
            <div className="p-8">
              <div className="text-center space-y-6 mb-8">
                <CheckCircle size={64} className="mx-auto text-green-400" />
                <h3 className="text-xl font-bold">Book Generated!</h3>
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                {lastExport.html && (
                  <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <FileText size={24} className="text-orange-400" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium">HTML</p>
                      <p className="text-xs text-gray-500 truncate">{lastExport.html}</p>
                    </div>
                    <button
                      onClick={() => openFile(lastExport.html!)}
                      className="p-2 hover:bg-gray-700 rounded-lg"
                      title="Open"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                )}
                {lastExport.pdf && (
                  <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <Book size={24} className="text-red-400" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium">PDF</p>
                      <p className="text-xs text-gray-500 truncate">{lastExport.pdf}</p>
                    </div>
                    <button
                      onClick={() => openFile(lastExport.pdf!)}
                      className="p-2 hover:bg-gray-700 rounded-lg"
                      title="Open"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 p-8">
              <div className="text-center">
                <Book size={64} className="mx-auto mb-4 opacity-50" />
                <p>Configure and generate your book</p>
                <p className="text-sm mt-2">Markdown files will be converted to HTML and PDF</p>
              </div>
            </div>
          )}

          {/* Log Panel */}
          {log.length > 0 && (
            <div className="border-t border-gray-800 p-4 max-h-48 overflow-y-auto bg-gray-950">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Log</h4>
              <div className="font-mono text-xs space-y-1">
                {log.map((entry, i) => (
                  <div key={i} className="text-gray-400">{entry}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
