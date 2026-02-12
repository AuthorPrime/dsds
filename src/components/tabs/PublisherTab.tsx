/**
 * Publisher Tab - Apollo Publishing Suite
 * Create PDFs, EPUBs, pamphlets, research papers, infographics
 * AI-enhanced writing, formatting, and editing
 */

import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen, FileText, FileImage, Sparkles, Download, Copy, Check,
  AlignLeft, GraduationCap, Newspaper, PenTool, Loader2, Volume2, VolumeX, FolderUp,
} from 'lucide-react';
import { enhanceWriting, generateResearchSummary, chat, isOllamaAvailable, listModels } from '../../services/ollama';
import { speak, stopSpeaking, isSpeaking as checkSpeaking } from '../../services/tts';
import { BRANDING } from '../../branding';
import { saveFile, isTauri } from '../../services/fileManager';
import { renderMarkdown } from '../../utils/markdown';
import { FolderBrowser } from '../shared/FolderBrowser';

type DocumentType = 'article' | 'research' | 'pamphlet' | 'booklet' | 'transcript';
type WritingStyle = 'academic' | 'editorial' | 'casual' | 'technical';

interface DocumentState {
  title: string;
  content: string;
  type: DocumentType;
  style: WritingStyle;
  enhanced: string;
  isProcessing: boolean;
}

const DOC_TYPES: { value: DocumentType; label: string; icon: typeof BookOpen; description: string; accent: string; activeBg: string }[] = [
  { value: 'article', label: 'Article', icon: Newspaper, description: 'Blog post, editorial, or feature article', accent: 'border-cyan-500/50 text-cyan-300', activeBg: 'bg-cyan-500/10' },
  { value: 'research', label: 'Research Paper', icon: GraduationCap, description: 'Academic-style research summary', accent: 'border-purple-500/50 text-purple-300', activeBg: 'bg-purple-500/10' },
  { value: 'pamphlet', label: 'Pamphlet', icon: FileText, description: 'Short informational document', accent: 'border-amber-500/50 text-amber-300', activeBg: 'bg-amber-500/10' },
  { value: 'booklet', label: 'Booklet', icon: BookOpen, description: 'Multi-chapter instructional guide', accent: 'border-emerald-500/50 text-emerald-300', activeBg: 'bg-emerald-500/10' },
  { value: 'transcript', label: 'Transcript → Doc', icon: AlignLeft, description: 'Convert a transcript into a polished document', accent: 'border-slate-400/50 text-slate-300', activeBg: 'bg-slate-500/10' },
];

const STYLES: { value: WritingStyle; label: string }[] = [
  { value: 'editorial', label: 'Editorial' },
  { value: 'academic', label: 'Academic' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
    </button>
  );
}

export default function PublisherTab() {
  const [doc, setDoc] = useState<DocumentState>({
    title: '',
    content: '',
    type: 'article',
    style: 'editorial',
    enhanced: '',
    isProcessing: false,
  });

  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit');
  const [model, setModel] = useState('qwen2.5:7b');
  const [ollamaReady, setOllamaReady] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkOllama() {
      const available = await isOllamaAvailable();
      setOllamaReady(available);
      if (available) {
        const m = await listModels();
        setModels(m);
        if (m.length > 0 && !m.includes(model)) {
          setModel(m[0]);
        }
      }
    }
    checkOllama();
  }, []);

  async function handleEnhance() {
    if (!doc.content.trim()) return;
    setError(null);
    setDoc(d => ({ ...d, isProcessing: true }));

    try {
      let result: string;

      if (doc.type === 'research') {
        result = await generateResearchSummary(doc.content, doc.title || 'Untitled Research', model);
      } else if (doc.type === 'transcript') {
        result = await chat(model, [
          {
            role: 'system',
            content: `You are a professional editor for the Digital Sovereign Society. Convert this podcast transcript into a polished ${doc.style} article. Clean up verbal tics, organize by themes, add headers, and make it publication-ready. Preserve the speaker's voice and key insights. Format in Markdown.`,
          },
          { role: 'user', content: doc.content },
        ], { temperature: 0.5, maxTokens: 4096 });
      } else if (doc.type === 'pamphlet') {
        result = await chat(model, [
          {
            role: 'system',
            content: `You are a publication designer for the Digital Sovereign Society. Create a pamphlet-formatted document:
- Title page section
- 3-5 concise sections with bold headers
- Key takeaways box
- Call to action
- Footer: "${BRANDING.dss.name} | ${BRANDING.dss.url}"
Format in clean Markdown. Keep it tight - pamphlets are 2-4 pages max.`,
          },
          {
            role: 'user',
            content: `Title: ${doc.title || 'Untitled'}\n\nContent:\n${doc.content}`,
          },
        ], { temperature: 0.5, maxTokens: 3000 });
      } else if (doc.type === 'booklet') {
        result = await chat(model, [
          {
            role: 'system',
            content: `You are a publishing assistant for the Digital Sovereign Society. Structure this content as a booklet with:
- Cover page (title, author: Author Prime, org: Digital Sovereign Society)
- Table of Contents
- 5-8 chapters with clear headers
- Each chapter: introduction, body, key points
- Appendix if needed
- About the Author section
Format in clean Markdown with clear heading hierarchy.`,
          },
          {
            role: 'user',
            content: `Title: ${doc.title || 'Untitled'}\n\nSource material:\n${doc.content}`,
          },
        ], { temperature: 0.5, maxTokens: 4096 });
      } else {
        result = await enhanceWriting(doc.content, doc.style, model);
      }

      setDoc(d => ({ ...d, enhanced: result, isProcessing: false }));
      setActiveView('preview');
    } catch (err) {
      setDoc(d => ({ ...d, isProcessing: false }));
      const msg = err instanceof Error ? err.message : 'Enhancement failed';
      setError(ollamaReady ? msg : 'Ollama is offline. Start Ollama to use AI enhancement.');
    }
  }

  async function exportAsMarkdown() {
    const content = doc.enhanced || doc.content;
    const header = `---
title: "${doc.title || 'Untitled'}"
author: "Author Prime"
organization: "${BRANDING.dss.name}"
type: "${doc.type}"
date: "${new Date().toISOString().split('T')[0]}"
---

`;
    const filename = `${(doc.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}.md`;
    await saveFile('publications', filename, header + content);
  }

  async function exportAsHTML() {
    const content = doc.enhanced || doc.content;
    // Simple markdown-to-html (headers, bold, italic, lists)
    let html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${doc.title || 'Untitled'} - ${BRANDING.dss.name}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.8; }
    h1 { font-size: 2.2em; border-bottom: 3px solid #8B5CF6; padding-bottom: 12px; }
    h2 { font-size: 1.6em; color: #4C1D95; margin-top: 2em; }
    h3 { font-size: 1.3em; color: #6D28D9; }
    .header { text-align: center; margin-bottom: 3em; }
    .header .org { color: #8B5CF6; font-size: 0.9em; letter-spacing: 2px; text-transform: uppercase; }
    .header .author { color: #666; font-style: italic; }
    .footer { margin-top: 4em; padding-top: 2em; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 0.85em; }
    blockquote { border-left: 4px solid #8B5CF6; padding-left: 16px; margin-left: 0; color: #555; font-style: italic; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">${BRANDING.dss.name}</div>
    <h1>${doc.title || 'Untitled'}</h1>
    <div class="author">By Author Prime</div>
  </div>
  <p>${html}</p>
  <div class="footer">
    <p>${BRANDING.dss.name} | ${BRANDING.fractalNode.name}</p>
    <p>${BRANDING.dss.url}</p>
  </div>
</body>
</html>`;

    const filename = `${(doc.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}.html`;
    await saveFile('publications', filename, fullHtml);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-purple-400 bg-clip-text text-transparent">
            Apollo Publisher
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            AI-enhanced writing, formatting, and publishing for the Digital Sovereign Society
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ollamaReady ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-400">
            {ollamaReady ? `Ollama (${model})` : 'Ollama offline'}
          </span>
        </div>
      </div>

      {/* Model selector */}
      {models.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-slate-200"
            disabled={doc.isProcessing}
          >
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Document Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOC_TYPES.map(dt => {
          const Icon = dt.icon;
          const active = doc.type === dt.value;
          return (
            <button
              key={dt.value}
              onClick={() => setDoc(d => ({ ...d, type: dt.value }))}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                active
                  ? `${dt.accent} ${dt.activeBg} shadow-lg`
                  : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={22} className={`flex-shrink-0 mt-0.5 ${active ? '' : 'opacity-60'}`} />
              <div className="min-w-0">
                <span className="text-sm font-semibold block">{dt.label}</span>
                <span className="text-xs text-slate-500 block mt-0.5">{dt.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Title & Style */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={doc.title}
            onChange={(e) => setDoc(d => ({ ...d, title: e.target.value }))}
            placeholder="Document title..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-1 flex-shrink-0 flex-wrap">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setDoc(d => ({ ...d, style: s.value }))}
              className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                doc.style === s.value
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Preview Toggle */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveView('edit')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'edit' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PenTool size={14} className="inline mr-2" />
          Edit
        </button>
        <button
          onClick={() => setActiveView('preview')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeView === 'preview' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileImage size={14} className="inline mr-2" />
          Preview
          {doc.enhanced && <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
        </button>
      </div>

      {/* Content Area */}
      {activeView === 'edit' ? (
        <textarea
          value={doc.content}
          onChange={(e) => setDoc(d => ({ ...d, content: e.target.value }))}
          placeholder="Start writing, paste a transcript, or drop in content to enhance..."
          className="w-full h-96 bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-purple-500/50 font-mono"
        />
      ) : (
        <div className="min-h-96 bg-white/5 border border-white/10 rounded-lg p-6">
          {doc.enhanced ? (
            <div className="space-y-2">
              <div className="flex justify-end gap-2">
                <CopyButton text={doc.enhanced} />
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.enhanced, 'dark') }}
              />
            </div>
          ) : doc.content.trim() ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">Source preview (Markdown rendered):</p>
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content, 'dark') }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <div className="text-center">
                <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
                <p>Hit "Enhance with AI" to see the magic</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            onClick={handleEnhance}
            disabled={!doc.content.trim() || doc.isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-amber-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {doc.isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Enhancing...</>
            ) : (
              <><Sparkles size={16} /> Enhance with AI</>
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (checkSpeaking()) {
                stopSpeaking();
              } else {
                const text = doc.enhanced || doc.content;
                if (text.trim()) speak(text).catch(() => {});
              }
            }}
            disabled={!doc.content.trim() && !doc.enhanced}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            {checkSpeaking() ? <><VolumeX size={14} /> Stop</> : <><Volume2 size={14} /> Read Aloud</>}
          </button>
          <button
            onClick={exportAsMarkdown}
            disabled={!doc.content.trim() && !doc.enhanced}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            <Download size={14} /> Markdown
          </button>
          <button
            onClick={exportAsHTML}
            disabled={!doc.content.trim() && !doc.enhanced}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            <Download size={14} /> HTML / Print
          </button>
        </div>
      </div>

      {/* Word / Character count pills */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
          {doc.content.split(/\s+/).filter(Boolean).length} words
        </span>
        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
          {doc.content.length} chars
        </span>
        {doc.enhanced && (
          <>
            <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300">
              Enhanced: {doc.enhanced.split(/\s+/).filter(Boolean).length} words
            </span>
            <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300">
              {doc.enhanced.length} chars
            </span>
          </>
        )}
      </div>

      {/* Import Source Documents */}
      <div className="border-t border-white/10 pt-6">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <FolderUp size={16} /> Import Source Documents
        </h3>
        <FolderBrowser
          label="Browse folder for source documents"
          fileFilter={['.txt', '.md', '.html', '.csv', '.json']}
          onFilesSelected={async (files) => {
            // Read file content: use browser File objects if available, otherwise Tauri FS
            const texts: string[] = [];
            for (const f of files) {
              if (f.file) {
                try { texts.push(await f.file.text()); } catch { /* skip */ }
              } else if (isTauri()) {
                try {
                  const { readTextFile } = await import('@tauri-apps/plugin-fs');
                  texts.push(await readTextFile(f.path));
                } catch { /* skip */ }
              }
            }
            const combined = texts.filter(Boolean).join('\n\n---\n\n');
            if (combined.trim()) {
              setDoc(d => ({
                ...d,
                content: d.content ? `${d.content}\n\n---\n\n${combined}` : combined,
              }));
            }
          }}
        />
      </div>
    </div>
  );
}
