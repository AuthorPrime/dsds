/**
 * Workshop Tab — Unified content workspace
 * Merges: DocsTab (View) + PublisherTab (Write) + TranscribeTab (Transcribe)
 *
 * Layout: Shared file sidebar | Main area with sub-tabs (View / Write / Transcribe)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Upload, FileText, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Copy, Check, Download, FileAudio, Loader2, CheckCircle,
  Mic, MicOff, AlertCircle, BookOpen, Sparkles, PenTool, FileImage,
  GraduationCap, Newspaper, AlignLeft, Volume2, VolumeX, FolderUp,
  FileDown, Layout, MessageSquare, Share2, Hash,
} from 'lucide-react';
import { getSettings, incrementStat } from '../../hooks/useSettings';
import { getUserBranding } from '../../branding';
import { enhanceWriting, generateResearchSummary, chat, isOllamaAvailable, listModels } from '../../services/ollama';
import { speak, stopSpeaking, isSpeaking as checkSpeaking } from '../../services/tts';
import { saveFile, saveBlob } from '../../services/fileManager';
import { renderMarkdown } from '../../utils/markdown';
import { eventBus, EVENTS } from '../../services/eventBus';

// ─── Types ──────────────────────────────────────────────────────────
type SubTab = 'view' | 'write' | 'transcribe';
type DocumentType = 'article' | 'research' | 'pamphlet' | 'booklet' | 'transcript';
type WritingStyle = 'academic' | 'editorial' | 'casual' | 'technical';
type FontFamily = 'sans' | 'serif' | 'mono';

interface SidebarFile {
  id: string;
  name: string;
  kind: 'document' | 'audio';
  // Document fields
  docType?: 'pdf' | 'md' | 'txt';
  content?: string;
  objectUrl?: string;
  // Audio/video fields
  file?: File;
  transcriptStatus?: 'pending' | 'processing' | 'done' | 'error';
  transcript?: string;
  errorMsg?: string;
}

interface DocumentState {
  title: string;
  content: string;
  type: DocumentType;
  style: WritingStyle;
  enhanced: string;
  isProcessing: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────
const DOC_TYPES: { value: DocumentType; label: string; icon: typeof BookOpen; desc: string; accent: string; activeBg: string }[] = [
  { value: 'article', label: 'Article', icon: Newspaper, desc: 'Blog post or feature article', accent: 'border-cyan-500/50 text-cyan-300', activeBg: 'bg-cyan-500/10' },
  { value: 'research', label: 'Research', icon: GraduationCap, desc: 'Academic-style summary', accent: 'border-purple-500/50 text-purple-300', activeBg: 'bg-purple-500/10' },
  { value: 'pamphlet', label: 'Pamphlet', icon: FileText, desc: 'Short informational doc', accent: 'border-amber-500/50 text-amber-300', activeBg: 'bg-amber-500/10' },
  { value: 'booklet', label: 'Booklet', icon: BookOpen, desc: 'Multi-chapter guide', accent: 'border-emerald-500/50 text-emerald-300', activeBg: 'bg-emerald-500/10' },
  { value: 'transcript', label: 'Transcript', icon: AlignLeft, desc: 'Polish a transcript into a document', accent: 'border-slate-400/50 text-slate-300', activeBg: 'bg-slate-500/10' },
];

const STYLES: { value: WritingStyle; label: string }[] = [
  { value: 'editorial', label: 'Editorial' },
  { value: 'academic', label: 'Academic' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
];

// ─── Templates for empty-state ──────────────────────────────────────
interface WriteTemplate {
  id: string;
  title: string;
  desc: string;
  icon: typeof BookOpen;
  accent: string;
  docType: DocumentType;
  style: WritingStyle;
  starterTitle: string;
  starterPrompt: string;
}

const WRITE_TEMPLATES: WriteTemplate[] = [
  {
    id: 'show-notes',
    title: 'Episode Show Notes',
    desc: 'Generate structured show notes from a recording transcript',
    icon: Hash,
    accent: 'purple-400',
    docType: 'transcript',
    style: 'editorial',
    starterTitle: '',
    starterPrompt: 'Paste your episode transcript here, then click "Enhance with AI" to generate professional show notes with timestamps, key topics, and links.',
  },
  {
    id: 'blog-from-episode',
    title: 'Blog Post from Episode',
    desc: 'Turn a podcast episode into a polished blog article',
    icon: Newspaper,
    accent: 'cyan-400',
    docType: 'article',
    style: 'editorial',
    starterTitle: '',
    starterPrompt: 'Paste your transcript or episode notes here. The AI will transform it into a polished blog post with headers, quotes, and a natural reading flow.',
  },
  {
    id: 'social-kit',
    title: 'Social Media Kit',
    desc: 'Create a set of social posts to promote your latest episode',
    icon: Share2,
    accent: 'amber-400',
    docType: 'pamphlet',
    style: 'casual',
    starterTitle: 'Social Media Kit',
    starterPrompt: 'Paste your episode description or key talking points. The AI will create a kit with posts for Twitter/X, LinkedIn, Facebook, and Instagram.',
  },
  {
    id: 'newsletter',
    title: 'Newsletter Issue',
    desc: 'Draft a newsletter update for your audience',
    icon: Layout,
    accent: 'emerald-400',
    docType: 'article',
    style: 'editorial',
    starterTitle: '',
    starterPrompt: 'Write your newsletter highlights or paste content from recent episodes. The AI will format it into an engaging newsletter with sections and a personal touch.',
  },
  {
    id: 'research-brief',
    title: 'Research Brief',
    desc: 'Compile a topic into a structured research document',
    icon: GraduationCap,
    accent: 'violet-400',
    docType: 'research',
    style: 'academic',
    starterTitle: '',
    starterPrompt: 'Paste your source material, notes, or transcript. The AI will organize it into a structured research brief with an abstract, key findings, and references.',
  },
  {
    id: 'blank',
    title: 'Blank Document',
    desc: 'Start fresh with a clean canvas',
    icon: FileText,
    accent: 'slate-400',
    docType: 'article',
    style: 'editorial',
    starterTitle: '',
    starterPrompt: '',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }, [text]);
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════
// WorkshopTab
// ═════════════════════════════════════════════════════════════════════

export function WorkshopTab() {
  const [subTab, setSubTab] = useState<SubTab>('write');
  const [files, setFiles] = useState<SidebarFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SidebarFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ─── VIEW state ────────────────────────────────────────────────
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ─── WRITE state ───────────────────────────────────────────────
  const [doc, setDoc] = useState<DocumentState>({ title: '', content: '', type: 'article', style: 'editorial', enhanced: '', isProcessing: false });
  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [model, setModel] = useState('qwen2.5:7b');
  const [ollamaReady, setOllamaReady] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [writeError, setWriteError] = useState<string | null>(null);

  // ─── TRANSCRIBE state ──────────────────────────────────────────
  const [settings] = useState(() => getSettings());
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isWhisperMode = settings.sttProvider !== 'web_speech';

  // ─── Content-from-recording listener ──────────────────────────
  // When Studio sends a transcript, offer it in Workshop
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

  useEffect(() => {
    return eventBus.on<string>(EVENTS.SESSION_TRANSCRIPT_READY, (text) => {
      setPendingTranscript(text);
    });
  }, []);

  const applyTemplate = useCallback((template: WriteTemplate) => {
    setDoc({
      title: template.starterTitle,
      content: template.starterPrompt,
      type: template.docType,
      style: template.style,
      enhanced: '',
      isProcessing: false,
    });
    setActiveView('edit');
    setSubTab('write');
  }, []);

  const loadTranscriptIntoWrite = useCallback((transcript: string) => {
    setDoc(d => ({
      ...d,
      content: transcript,
      type: 'transcript' as DocumentType,
      title: d.title || 'Episode Transcript',
    }));
    setPendingTranscript(null);
    setSubTab('write');
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); }); };
  }, [files]);

  useEffect(() => { setCurrentPage(1); setLoading(true); const t = setTimeout(() => setLoading(false), 300); return () => clearTimeout(t); }, [selectedFile?.id]);

  useEffect(() => {
    async function check() {
      const ok = await isOllamaAvailable(); setOllamaReady(ok);
      if (ok) { const m = await listModels(); setModels(m); if (m.length > 0 && !m.includes(model)) setModel(m[0]); }
    }
    check();
  }, []);

  // ─── Unified drag/drop ────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    dropped.forEach(async (file) => {
      const id = crypto.randomUUID();
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase() || '';

      // Audio/Video → add as audio file
      if (file.type.startsWith('audio/') || file.type.startsWith('video/') || ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg'].includes(ext)) {
        setFiles(prev => [...prev, { id, name, kind: 'audio', file, transcriptStatus: 'pending' }]);
        setSubTab('transcribe');
        return;
      }

      // Documents
      if (ext === 'pdf') {
        const objectUrl = URL.createObjectURL(file);
        setFiles(prev => [...prev, { id, name, kind: 'document', docType: 'pdf', content: '', objectUrl }]);
      } else if (ext === 'md') {
        const text = await file.text();
        setFiles(prev => [...prev, { id, name, kind: 'document', docType: 'md', content: text }]);
      } else if (['txt', 'html', 'csv', 'json'].includes(ext)) {
        const text = await file.text();
        setFiles(prev => [...prev, { id, name, kind: 'document', docType: 'txt', content: text }]);
      }
      setSubTab('view');
    });
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const dt = new DataTransfer();
    Array.from(e.target.files).forEach(f => dt.items.add(f));
    const fakeEvent = { preventDefault: () => {}, dataTransfer: dt } as unknown as React.DragEvent;
    handleDrop(fakeEvent);
    e.target.value = '';
  }, [handleDrop]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.objectUrl) URL.revokeObjectURL(f.objectUrl);
      return prev.filter(x => x.id !== id);
    });
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  const selectFile = (file: SidebarFile) => {
    setSelectedFile(file);
    if (file.kind === 'document') setSubTab('view');
    else if (file.kind === 'audio' && file.transcriptStatus === 'done') setSubTab('view');
  };

  // ─── Transcribe file (Whisper) ────────────────────────────────
  const transcribeFile = useCallback(async (file: SidebarFile) => {
    if (!file.file) return;
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, transcriptStatus: 'processing' as const } : f));
    try {
      const formData = new FormData();
      formData.append('file', file.file);
      if (settings.sttModel) formData.append('model', settings.sttModel);
      formData.append('response_format', 'text');
      const res = await fetch('http://localhost:8080/inference', { method: 'POST', body: formData, signal: AbortSignal.timeout(300000) });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const transcript = await res.text();
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, transcriptStatus: 'done' as const, transcript: transcript.trim() } : f));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, transcriptStatus: 'error' as const, errorMsg: msg } : f));
    }
  }, [settings.sttModel]);

  // ─── Live transcription ───────────────────────────────────────
  const toggleLiveTranscription = useCallback(() => {
    if (isLiveTranscribing) {
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); recognitionRef.current = null; }
      setIsLiveTranscribing(false); setInterimText(''); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Web Speech API not supported. Use Chrome or Edge.'); return; }
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { setLiveTranscript(prev => prev + e.results[i][0].transcript + ' '); setInterimText(''); }
        else interim += e.results[i][0].transcript;
      }
      if (interim) setInterimText(interim);
    };
    rec.onerror = (e: Event & { error?: string }) => { const et = e.error || 'unknown'; if (et === 'no-speech' || et === 'aborted') return; setSpeechError(`Speech error: ${et}`); };
    rec.onend = () => { if (recognitionRef.current) try { recognitionRef.current.start(); } catch { /* */ } };
    recognitionRef.current = rec; rec.start(); setIsLiveTranscribing(true);
  }, [isLiveTranscribing]);

  // ─── WRITE handlers ───────────────────────────────────────────
  async function handleEnhance() {
    if (!doc.content.trim()) return;
    setWriteError(null);
    setDoc(d => ({ ...d, isProcessing: true }));
    const brand = getUserBranding();
    try {
      let result: string;
      if (doc.type === 'research') {
        result = await generateResearchSummary(doc.content, doc.title || 'Untitled Research', model);
      } else if (doc.type === 'transcript') {
        result = await chat(model, [
          { role: 'system', content: `You are a professional editor. Convert this podcast transcript into a polished ${doc.style} article. Clean up verbal tics, organize by themes, add headers. Format in Markdown.` },
          { role: 'user', content: doc.content },
        ], { temperature: 0.5, maxTokens: 4096 });
      } else if (doc.type === 'pamphlet') {
        result = await chat(model, [
          { role: 'system', content: `Create a pamphlet-formatted document:\n- Title page section\n- 3-5 concise sections with bold headers\n- Key takeaways box\n- Call to action\nFormat in clean Markdown.` },
          { role: 'user', content: `Title: ${doc.title || 'Untitled'}\n\nContent:\n${doc.content}` },
        ], { temperature: 0.5, maxTokens: 3000 });
      } else if (doc.type === 'booklet') {
        result = await chat(model, [
          { role: 'system', content: `Structure this content as a booklet with:\n- Cover page (title${brand.hostName ? `, author: ${brand.hostName}` : ''}${brand.organizationName ? `, org: ${brand.organizationName}` : ''})\n- Table of Contents\n- 5-8 chapters with clear headers\n- Each chapter: introduction, body, key points\nFormat in clean Markdown.` },
          { role: 'user', content: `Title: ${doc.title || 'Untitled'}\n\nSource material:\n${doc.content}` },
        ], { temperature: 0.5, maxTokens: 4096 });
      } else {
        result = await enhanceWriting(doc.content, doc.style, model);
      }
      setDoc(d => ({ ...d, enhanced: result, isProcessing: false }));
      incrementStat('totalEnhancements');
      setActiveView('preview');
    } catch (err) {
      setDoc(d => ({ ...d, isProcessing: false }));
      setWriteError(ollamaReady ? (err instanceof Error ? err.message : 'Enhancement failed') : 'Ollama is offline.');
    }
  }

  async function exportMarkdown() {
    const content = doc.enhanced || doc.content;
    const brand = getUserBranding();
    const header = `---\ntitle: "${doc.title || 'Untitled'}"\nauthor: "${brand.hostName}"${brand.organizationName ? `\norganization: "${brand.organizationName}"` : ''}\ntype: "${doc.type}"\ndate: "${new Date().toISOString().split('T')[0]}"\n---\n\n`;
    const filename = `${(doc.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}.md`;
    await saveFile('publications', filename, header + content);
  }

  async function exportHTML() {
    const content = doc.enhanced || doc.content;
    const brand = getUserBranding();
    let html = content.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.title || 'Untitled'}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:1.8}h1{font-size:2.2em;border-bottom:3px solid #8B5CF6;padding-bottom:12px}h2{font-size:1.6em;color:#4C1D95;margin-top:2em}h3{font-size:1.3em;color:#6D28D9}.header{text-align:center;margin-bottom:3em}.header .org{color:#8B5CF6;font-size:.9em;letter-spacing:2px;text-transform:uppercase}.header .author{color:#666;font-style:italic}.footer{margin-top:4em;padding-top:2em;border-top:1px solid #ddd;text-align:center;color:#888;font-size:.85em}</style></head><body><div class="header">${brand.organizationName ? `<div class="org">${brand.organizationName}</div>` : ''}<h1>${doc.title || 'Untitled'}</h1>${brand.hostName ? `<div class="author">By ${brand.hostName}</div>` : ''}</div><p>${html}</p><div class="footer"><p>Sovereign Studio</p></div></body></html>`;
    const filename = `${(doc.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}.html`;
    await saveFile('publications', filename, fullHtml);
  }

  // Font class for Write sub-tab
  const fontClass = fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  // ─── Render doc content in View ───────────────────────────────
  // Document page: fills available width with comfortable margins
  const docPageClass = 'bg-white text-gray-900 shadow-2xl rounded-lg mx-auto w-full';
  const docPageStyle = (extraStyle?: React.CSSProperties): React.CSSProperties => ({
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center',
    ...extraStyle,
  });

  const renderDocContent = () => {
    if (!selectedFile) return null;
    if (selectedFile.kind === 'audio' && selectedFile.transcript) {
      return (
        <div className={docPageClass} style={docPageStyle({ padding: '2.5rem 3rem' })}>
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{selectedFile.transcript}</pre>
        </div>
      );
    }
    if (selectedFile.docType === 'pdf') {
      return (
        <div className="absolute inset-0">
          <iframe ref={iframeRef} src={`${selectedFile.objectUrl}#page=${currentPage}`} className="border-0" title={selectedFile.name}
            style={{ width: '100%', height: '100%' }} />
        </div>
      );
    }
    if (selectedFile.docType === 'md') {
      return <div className={docPageClass} style={docPageStyle({ padding: '2.5rem 3rem' })}><div className="prose prose-lg max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFile.content || '', 'light') }} /></div>;
    }
    return <div className={docPageClass} style={docPageStyle({ padding: '2.5rem 3rem' })}><pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{selectedFile.content}</pre></div>;
  };

  // Open file content in Write sub-tab
  const openInEditor = (file: SidebarFile) => {
    const text = file.kind === 'audio' ? file.transcript || '' : file.content || '';
    if (text) {
      setDoc(d => ({ ...d, content: d.content ? `${d.content}\n\n---\n\n${text}` : text, title: d.title || file.name.replace(/\.[^.]+$/, '') }));
      setSubTab('write');
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex min-h-0">
      {/* ── SIDEBAR ── */}
      <div className="w-64 border-r border-white/[0.06] flex flex-col flex-shrink-0 bg-gray-950/40">
        <div className="px-4 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-base font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">Workshop</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Upload, transcribe, write, export</p>
        </div>

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`mx-3 my-3 p-4 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/60 hover:border-gray-600'}`}
        >
          <Upload size={20} className={`mx-auto mb-1.5 ${isDragging ? 'text-cyan-400' : 'text-gray-500'}`} />
          <p className="text-xs text-gray-400">Drop any files</p>
          <p className="text-[10px] text-gray-600 mt-0.5">PDF, MD, TXT, MP3, WAV, MP4</p>
          <label className="mt-2 inline-block text-[11px] text-cyan-400 cursor-pointer hover:underline">
            or browse
            <input type="file" accept=".pdf,.md,.txt,.html,.csv,.json,audio/*,video/*" multiple onChange={handleFileInput} className="hidden" />
          </label>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {files.length === 0 ? (
            <p className="text-center text-gray-600 text-xs py-6">No files yet</p>
          ) : (
            files.map(file => (
              <div key={file.id} onClick={() => selectFile(file)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${selectedFile?.id === file.id ? 'bg-cyan-900/15 border-cyan-500/40' : 'bg-gray-800/30 border-white/[0.04] hover:border-white/[0.08]'}`}
              >
                {file.kind === 'audio' ? <FileAudio size={14} className="text-purple-400 flex-shrink-0" /> : <FileText size={14} className={`flex-shrink-0 ${file.docType === 'pdf' ? 'text-red-400' : file.docType === 'md' ? 'text-blue-400' : 'text-gray-400'}`} />}
                <div className="flex-1 min-w-0">
                  <span className="text-xs truncate block text-slate-200">{file.name}</span>
                  <span className="text-[10px] text-gray-600 uppercase">{file.kind === 'audio' ? (file.transcriptStatus || 'audio') : file.docType}</span>
                </div>
                <div className="flex items-center gap-1">
                  {file.kind === 'audio' && file.transcriptStatus === 'pending' && <button onClick={(e) => { e.stopPropagation(); transcribeFile(file); }} className="text-[10px] px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white">Start</button>}
                  {file.kind === 'audio' && file.transcriptStatus === 'processing' && <Loader2 size={12} className="text-cyan-400 animate-spin" />}
                  {file.kind === 'audio' && file.transcriptStatus === 'done' && <CheckCircle size={12} className="text-green-400" />}
                  {file.kind === 'audio' && file.transcriptStatus === 'error' && <button onClick={(e) => { e.stopPropagation(); transcribeFile(file); }} className="text-[10px] px-1.5 py-0.5 bg-amber-600 rounded text-white">Retry</button>}
                  {/* Open in Writer — available for docs with content, or audio with transcript */}
                  {((file.kind === 'document' && file.content) || (file.kind === 'audio' && file.transcript)) && (
                    <button onClick={(e) => { e.stopPropagation(); openInEditor(file); }}
                      className="text-gray-500 hover:text-purple-400 p-0.5" title="Open in Writer">
                      <PenTool size={11} />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeFile(file.id); }} className="text-gray-600 hover:text-red-400 ml-0.5 p-0.5"><Trash2 size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Sub-tab bar */}
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-gray-900/40 px-4 relative z-10">
          <div className="flex gap-1">
            {(['view', 'write', 'transcribe'] as SubTab[]).map(t => (
              <button key={t} onClick={() => setSubTab(t)}
                className={`px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-[1px] transition-all capitalize ${subTab === t ? 'text-cyan-300 border-cyan-500 bg-cyan-500/[0.06]' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'}`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* ── VIEW sub-tab ── */}
        <div className={subTab === 'view' ? 'flex-1 flex flex-col bg-gray-950 min-h-0' : 'hidden'}>
          {selectedFile && (selectedFile.kind === 'document' || (selectedFile.kind === 'audio' && selectedFile.transcript)) ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-11 border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setZoom(z => Math.max(50, z - 10))}><ZoomOut size={16} /></button>
                  <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
                  <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setZoom(z => Math.min(200, z + 10))}><ZoomIn size={16} /></button>
                </div>
                {selectedFile.docType === 'pdf' && (
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
                    <span className="text-xs text-gray-400">Page {currentPage} / {totalPages}</span>
                    <button className="p-1 hover:bg-gray-800 rounded" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></button>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {selectedFile.docType !== 'pdf' && (
                    <button onClick={() => { navigator.clipboard.writeText(selectedFile.content || selectedFile.transcript || '').catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="px-2.5 py-1 bg-gray-700/60 hover:bg-gray-600/60 rounded text-xs flex items-center gap-1.5">
                      {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  )}
                  <button onClick={() => openInEditor(selectedFile)} className="px-2.5 py-1 bg-purple-700/60 hover:bg-purple-600/60 rounded text-xs flex items-center gap-1.5"><PenTool size={12} /> Edit</button>
                  <button onClick={async () => {
                    if (selectedFile.docType === 'pdf' && selectedFile.objectUrl) { try { const r = await fetch(selectedFile.objectUrl); const b = await r.blob(); await saveBlob('publications', selectedFile.name, b); } catch { const a = document.createElement('a'); a.href = selectedFile.objectUrl!; a.download = selectedFile.name; a.click(); } }
                    else { const text = selectedFile.content || selectedFile.transcript || ''; await saveFile('publications', selectedFile.name, text); }
                  }} className="px-2.5 py-1 bg-gray-700/60 hover:bg-gray-600/60 rounded text-xs flex items-center gap-1.5"><Download size={12} /> Save</button>
                </div>
              </div>
              <div
                className={`flex-1 relative min-h-0 ${selectedFile.docType === 'pdf' ? 'overflow-hidden' : 'overflow-auto'}`}
                style={{ padding: selectedFile.docType === 'pdf' ? 0 : '1rem 1.5rem' }}
              >
                {loading ? <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center"><div className="w-7 h-7 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-xs">Loading...</p></div></div> : renderDocContent()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center"><FileText size={48} className="mx-auto mb-3 opacity-40" /><p className="text-sm">Select a file to view</p><p className="text-xs mt-1.5 text-gray-600">or drop files into the sidebar</p></div>
            </div>
          )}
        </div>

        {/* ── WRITE sub-tab ── */}
        <div className={subTab === 'write' ? 'flex-1 overflow-y-auto' : 'hidden'}>
          <div className="max-w-4xl mx-auto px-6 py-5 space-y-5">

            {/* Content-from-Recording banner */}
            {pendingTranscript && (
              <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/15 flex-shrink-0">
                  <MessageSquare size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">New recording transcript available</p>
                  <p className="text-xs text-slate-500 mt-0.5">{pendingTranscript.split(/\s+/).length} words from your last session</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => loadTranscriptIntoWrite(pendingTranscript)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity">
                      <FileDown size={12} /> Load into Editor
                    </button>
                    <button onClick={() => setPendingTranscript(null)}
                      className="px-3 py-1.5 border border-white/[0.08] rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header + model */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-purple-400 bg-clip-text text-transparent">Writer</h2>
                <p className="text-xs text-slate-400 mt-1">AI-enhanced writing and publishing</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${ollamaReady ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-400">{ollamaReady ? `Ollama (${model})` : 'Ollama offline'}</span>
              </div>
            </div>
            {models.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400">Model:</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500/40" disabled={doc.isProcessing}>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            {writeError && <div className="bg-red-900/15 border border-red-500/25 rounded-lg p-3 text-sm text-red-400">{writeError}</div>}

            {/* ── Template Picker (shown when editor is empty) ── */}
            {!doc.content.trim() && !doc.title.trim() && !doc.enhanced && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <Sparkles size={24} className="mx-auto text-amber-400/60 mb-2" />
                  <h3 className="text-base font-semibold text-slate-200">What would you like to create?</h3>
                  <p className="text-xs text-slate-500 mt-1">Pick a template to get started, or choose Blank Document</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {WRITE_TEMPLATES.map(tmpl => {
                    const Icon = tmpl.icon;
                    return (
                      <button key={tmpl.id} onClick={() => applyTemplate(tmpl)}
                        className={`group flex flex-col items-start gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-${tmpl.accent}/30 hover:bg-white/[0.02] transition-all text-left`}>
                        <div className={`p-2 rounded-lg bg-${tmpl.accent}/10 text-${tmpl.accent}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{tmpl.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{tmpl.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Full editor (shown when user has content) ── */}
            {(doc.content.trim() || doc.title.trim() || doc.enhanced) && <>

            {/* Doc type selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DOC_TYPES.map(dt => {
                const Icon = dt.icon; const active = doc.type === dt.value;
                return (
                  <button key={dt.value} onClick={() => setDoc(d => ({ ...d, type: dt.value }))}
                    className={`flex items-start gap-2.5 p-3.5 rounded-xl border transition-all text-left ${active ? `${dt.accent} ${dt.activeBg} shadow-md` : 'border-white/[0.06] hover:border-white/[0.12] text-slate-400 hover:text-slate-200'}`}
                  >
                    <Icon size={20} className={`flex-shrink-0 mt-0.5 ${active ? '' : 'opacity-50'}`} />
                    <div className="min-w-0"><span className="text-sm font-semibold block">{dt.label}</span><span className="text-[11px] text-slate-500 block mt-0.5">{dt.desc}</span></div>
                  </button>
                );
              })}
            </div>

            {/* Title, style, and format controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input type="text" value={doc.title} onChange={(e) => setDoc(d => ({ ...d, title: e.target.value }))}
                  placeholder="Document title..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/40" />
              </div>
              <div className="flex gap-1 flex-shrink-0 flex-wrap">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setDoc(d => ({ ...d, style: s.value }))}
                    className={`px-3 py-2 rounded-lg text-xs border transition-all ${doc.style === s.value ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-300' : 'border-white/[0.06] text-slate-400 hover:text-slate-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format controls (independent of AI) */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-slate-500">Display font:</span>
              {(['sans', 'serif', 'mono'] as FontFamily[]).map(f => (
                <button key={f} onClick={() => setFontFamily(f)}
                  className={`px-2.5 py-1.5 rounded text-[11px] border transition-all capitalize ${fontFamily === f ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300' : 'border-white/[0.06] text-slate-400 hover:text-slate-200'}`}>
                  {f}
                </button>
              ))}
            </div>

            {/* Editor / Preview toggle */}
            <div className="flex gap-1.5 border-b border-white/[0.06] pb-2">
              <button onClick={() => setActiveView('edit')}
                className={`px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${activeView === 'edit' ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-slate-200'}`}>
                <PenTool size={12} className="inline mr-1.5" />Edit
              </button>
              <button onClick={() => setActiveView('preview')}
                className={`px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${activeView === 'preview' ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-slate-200'}`}>
                <FileImage size={12} className="inline mr-1.5" />Preview{doc.enhanced && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
              </button>
            </div>

            {activeView === 'edit' ? (
              <textarea value={doc.content} onChange={(e) => setDoc(d => ({ ...d, content: e.target.value }))}
                placeholder="Start writing, paste a transcript, or drop content..."
                className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-purple-500/40 ${fontClass}`}
                style={{ minHeight: '20rem', height: '50vh' }} />
            ) : (
              <div className={`bg-white/[0.04] border border-white/[0.08] rounded-lg p-5 ${fontClass}`} style={{ minHeight: '20rem' }}>
                {doc.enhanced ? (
                  <div className="space-y-2"><div className="flex justify-end gap-2"><CopyButton text={doc.enhanced} /></div><div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.enhanced, 'dark') }} /></div>
                ) : doc.content.trim() ? (
                  <div className="space-y-2"><p className="text-[11px] text-slate-500 mb-2">Source preview:</p><div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content, 'dark') }} /></div>
                ) : (
                  <div className="flex items-center justify-center h-56 text-slate-500"><div className="text-center"><Sparkles size={28} className="mx-auto mb-3 opacity-40" /><p className="text-sm">Write something or enhance with AI</p></div></div>
                )}
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button onClick={handleEnhance} disabled={!doc.content.trim() || doc.isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-amber-600 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {doc.isProcessing ? <><Loader2 size={14} className="animate-spin" /> Enhancing...</> : <><Sparkles size={14} /> Enhance with AI</>}
              </button>
              <div className="flex gap-1.5">
                <button onClick={() => { if (checkSpeaking()) stopSpeaking(); else { const t = doc.enhanced || doc.content; if (t.trim()) speak(t).catch(() => {}); } }} disabled={!doc.content.trim() && !doc.enhanced}
                  className="flex items-center gap-1.5 px-3 py-2 border border-white/[0.08] rounded-lg text-xs hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
                  {checkSpeaking() ? <><VolumeX size={12} /> Stop</> : <><Volume2 size={12} /> Read</>}
                </button>
                <button onClick={exportMarkdown} disabled={!doc.content.trim() && !doc.enhanced}
                  className="flex items-center gap-1.5 px-3 py-2 border border-white/[0.08] rounded-lg text-xs hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
                  <Download size={12} /> Markdown
                </button>
                <button onClick={exportHTML} disabled={!doc.content.trim() && !doc.enhanced}
                  className="flex items-center gap-1.5 px-3 py-2 border border-white/[0.08] rounded-lg text-xs hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
                  <Download size={12} /> HTML
                </button>
              </div>
            </div>

            {/* Word count badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[11px] text-slate-400">{doc.content.split(/\s+/).filter(Boolean).length} words</span>
              <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[11px] text-slate-400">{doc.content.length} chars</span>
              {doc.enhanced && <span className="px-2 py-0.5 bg-purple-500/[0.08] border border-purple-500/25 rounded-full text-[11px] text-purple-300">Enhanced: {doc.enhanced.split(/\s+/).filter(Boolean).length} words</span>}
            </div>

            {/* Tip: use sidebar to import documents */}
            <div className="border-t border-white/[0.06] pt-4 pb-1">
              <p className="text-[11px] text-slate-600 text-center flex items-center justify-center gap-1.5">
                <FolderUp size={12} /> Drop files into the sidebar to import — click <PenTool size={10} className="text-purple-400" /> to load into Writer
              </p>
            </div>

            </>}
          </div>
        </div>

        {/* ── TRANSCRIBE sub-tab ── */}
        <div className={subTab === 'transcribe' ? 'flex-1 flex flex-col' : 'hidden'}>
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Transcribe</h3>
              <p className="text-[11px] text-slate-500">{isWhisperMode ? `File transcription (${settings.sttProvider})` : 'Live mic (Web Speech API)'}</p>
            </div>
            <button onClick={() => { setSpeechError(null); toggleLiveTranscription(); }}
              className={`py-1.5 px-3.5 rounded-lg font-bold flex items-center gap-2 transition-all text-xs ${isLiveTranscribing ? 'bg-red-500/15 text-red-400 border border-red-500/40' : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:scale-[1.02]'}`}
            >{isLiveTranscribing ? <><MicOff size={13} /> Stop Live</> : <><Mic size={13} /> Live Transcribe</>}</button>
          </div>
          {speechError && <div className="mx-4 mt-2 p-2 bg-red-900/15 border border-red-500/25 rounded-lg flex items-center gap-2"><AlertCircle size={12} className="text-red-400" /><p className="text-[11px] text-red-400">{speechError}</p></div>}

          <div className="flex-1 overflow-y-auto p-5">
            {isLiveTranscribing || liveTranscript ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] text-slate-500">{isLiveTranscribing ? 'Listening...' : 'Session ended'}</span>
                  <div className="flex gap-1.5">
                    {liveTranscript && <>
                      <button onClick={() => navigator.clipboard.writeText(liveTranscript).catch(() => {})} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200" title="Copy"><Copy size={14} /></button>
                      <button onClick={async () => await saveFile('transcripts', 'live-transcript.txt', liveTranscript)} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-200" title="Save"><Download size={14} /></button>
                      <button onClick={() => { setLiveTranscript(''); setInterimText(''); }} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400" title="Clear"><Trash2 size={14} /></button>
                      <button onClick={() => { if (liveTranscript) { setDoc(d => ({ ...d, content: d.content ? `${d.content}\n\n${liveTranscript}` : liveTranscript })); setSubTab('write'); } }}
                        className="px-2.5 py-1 bg-purple-700/60 hover:bg-purple-600/60 rounded text-xs flex items-center gap-1.5"><PenTool size={12} /> Edit</button>
                    </>}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                  {liveTranscript}
                  {interimText && <span className="text-slate-500 italic">{interimText}</span>}
                </p>
                {isLiveTranscribing && !liveTranscript && !interimText && <div className="flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /><span className="text-xs">Waiting for speech...</span></div>}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center">
                  <FileAudio size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Click "Live Transcribe" or upload audio files</p>
                  <p className="text-xs text-gray-600 mt-1">in the sidebar</p>
                  {isWhisperMode && <div className="mt-4 p-2.5 bg-amber-900/15 border border-amber-500/25 rounded-lg inline-block"><p className="text-[11px] text-amber-400 flex items-center gap-2"><AlertCircle size={12} />Whisper.cpp must be running on localhost:8080</p></div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
