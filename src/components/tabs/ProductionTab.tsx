/**
 * Production Tab - AI Post-Production Pipeline
 * Record → AI produces everything: title, description, show notes, social posts
 */

import { useState, useEffect, useCallback } from 'react';
import { Wand2, Play, RotateCcw, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ProductionPipeline } from '../../services/pipeline';
import type { PipelineState, EpisodePackage } from '../../services/pipeline';
import { isOllamaAvailable, listModels } from '../../services/ollama';
import { eventBus, EVENTS } from '../../services/eventBus';

const pipeline = new ProductionPipeline();

const STAGE_LABELS: Record<string, string> = {
  idle: 'Ready to produce',
  transcribing: 'Processing transcript',
  generating_title: 'Crafting episode title',
  generating_description: 'Writing description',
  generating_show_notes: 'Compiling show notes',
  generating_social: 'Creating social posts',
  generating_thumbnail: 'Preparing thumbnail',
  packaging: 'Packaging episode',
  complete: 'Episode complete!',
  error: 'Error occurred',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded hover:bg-white/10 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
    </button>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-slate-200">{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

export default function ProductionTab() {
  const [state, setState] = useState<PipelineState>(pipeline.getState());
  const [transcript, setTranscript] = useState('');
  const [ollamaReady, setOllamaReady] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:7b');

  useEffect(() => {
    const unsub = pipeline.subscribe(setState);
    checkOllama();
    return unsub;
  }, []);

  // Listen for auto-transcribe events from Studio tab
  useEffect(() => {
    return eventBus.on<string>(EVENTS.SESSION_TRANSCRIPT_READY, (text) => {
      setTranscript(prev => prev ? `${prev}\n\n${text}` : text);
    });
  }, []);

  // Keep pipeline model in sync with UI selection
  useEffect(() => {
    pipeline.setModel(selectedModel);
  }, [selectedModel]);

  async function checkOllama() {
    const available = await isOllamaAvailable();
    setOllamaReady(available);
    if (available) {
      const m = await listModels();
      setModels(m);
      if (m.length > 0 && !m.includes(selectedModel)) {
        setSelectedModel(m[0]);
      }
    }
  }

  async function runPipeline() {
    if (!transcript.trim()) return;
    try {
      await pipeline.produce(transcript);
    } catch {
      // Error handled in pipeline state
    }
  }

  const isRunning = !['idle', 'complete', 'error'].includes(state.stage);
  const episode = state.episode as Partial<EpisodePackage>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Production
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            AI-powered post-production pipeline for My Pretend Life
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ollamaReady ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-400">
            {ollamaReady ? `Ollama (${selectedModel})` : 'Ollama offline'}
          </span>
        </div>
      </div>

      {/* Model selector */}
      {models.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-slate-200"
            disabled={isRunning}
          >
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Transcript Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Episode Transcript</label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste your episode transcript here, or record in the Studio tab and it will appear automatically..."
          className="w-full h-48 bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-purple-500/50"
          disabled={isRunning}
        />
        <div className="text-xs text-slate-500">
          {transcript.length > 0 ? `${transcript.split(/\s+/).length} words` : 'No transcript loaded'}
        </div>
      </div>

      {/* Pipeline Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={runPipeline}
          disabled={!ollamaReady || !transcript.trim() || isRunning}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isRunning ? (
            <><Loader2 size={18} className="animate-spin" /> Producing...</>
          ) : (
            <><Wand2 size={18} /> Produce Episode</>
          )}
        </button>

        {state.stage === 'complete' && (
          <button
            onClick={() => pipeline.reset()}
            className="flex items-center gap-2 px-4 py-3 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={16} /> New Episode
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {state.stage !== 'idle' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">{STAGE_LABELS[state.stage] ?? state.stage}</span>
            <span className="text-slate-400">{state.progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                state.stage === 'error'
                  ? 'bg-red-500'
                  : state.stage === 'complete'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-purple-500 to-cyan-500'
              }`}
              style={{ width: `${state.progress}%` }}
            />
          </div>
          {state.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
        </div>
      )}

      {/* Results */}
      {(episode.title || episode.description || episode.showNotes || episode.socialPosts) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Play size={18} className="text-purple-400" />
            Episode Package
          </h3>

          {episode.title && (
            <CollapsibleSection title="Episode Title" defaultOpen>
              <div className="flex items-start justify-between gap-2 pt-3">
                <h4 className="text-xl font-bold text-white">{episode.title}</h4>
                <CopyButton text={episode.title} />
              </div>
            </CollapsibleSection>
          )}

          {episode.description && (
            <CollapsibleSection title="Description" defaultOpen>
              <div className="pt-3 space-y-2">
                <div className="flex justify-end">
                  <CopyButton text={episode.description} />
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{episode.description}</p>
              </div>
            </CollapsibleSection>
          )}

          {episode.showNotes && (
            <CollapsibleSection title="Show Notes">
              <div className="pt-3 space-y-2">
                <div className="flex justify-end">
                  <CopyButton text={episode.showNotes} />
                </div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{episode.showNotes}</div>
              </div>
            </CollapsibleSection>
          )}

          {episode.thumbnailFile && (
            <CollapsibleSection title="Episode Thumbnail" defaultOpen>
              <div className="pt-3 space-y-3">
                <img
                  src={episode.thumbnailFile}
                  alt="Episode thumbnail"
                  className="rounded-lg border border-white/10 w-full max-w-lg"
                />
                <a
                  href={episode.thumbnailFile}
                  download={`${(episode.title || 'episode').replace(/\s+/g, '_')}_thumbnail.png`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm text-slate-300"
                >
                  <RotateCcw size={14} /> Download Thumbnail
                </a>
              </div>
            </CollapsibleSection>
          )}

          {episode.socialPosts && (
            <CollapsibleSection title="Social Media Posts">
              <div className="pt-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">Twitter / X</span>
                    <CopyButton text={episode.socialPosts.twitter} />
                  </div>
                  <p className="text-sm text-slate-300 bg-white/5 rounded p-3">{episode.socialPosts.twitter}</p>
                  <span className="text-xs text-slate-500">{episode.socialPosts.twitter.length}/280</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Long Form</span>
                    <CopyButton text={episode.socialPosts.long} />
                  </div>
                  <p className="text-sm text-slate-300 bg-white/5 rounded p-3 whitespace-pre-wrap">{episode.socialPosts.long}</p>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
