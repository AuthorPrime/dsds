/**
 * Production Pipeline - AI Orchestrator
 * Takes a recording and produces a complete episode package
 */

import {
  generateEpisodeTitle,
  generateEpisodeDescription,
  generateSocialPosts,
  generateShowNotes,
} from './ollama';
import { generateThumbnail } from './thumbnail';
import { saveBlob } from './fileManager';
import { getUserBranding } from '../branding';

export type PipelineStage =
  | 'idle'
  | 'transcribing'
  | 'generating_title'
  | 'generating_description'
  | 'generating_show_notes'
  | 'generating_social'
  | 'generating_thumbnail'
  | 'packaging'
  | 'complete'
  | 'error';

export interface EpisodePackage {
  // Metadata
  title: string;
  description: string;
  showNotes: string;
  episodeNumber?: number;
  recordedAt: string;
  duration: number;

  // Content
  transcript: string;
  socialPosts: {
    twitter: string;
    long: string;
  };

  // Files (paths)
  audioFile?: string;
  videoFile?: string;
  thumbnailFile?: string;

  // Branding
  show: string;
  host: string;
  organization: string;
}

export interface PipelineState {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  episode: Partial<EpisodePackage>;
  error?: string;
}

type PipelineListener = (state: PipelineState) => void;

export class ProductionPipeline {
  private state: PipelineState;
  private listeners: PipelineListener[] = [];
  private model: string;

  constructor(model = 'qwen2.5:7b') {
    this.model = model;
    this.state = {
      stage: 'idle',
      progress: 0,
      message: 'Ready',
      episode: {},
    };
  }

  setModel(model: string) {
    this.model = model;
  }

  subscribe(listener: PipelineListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  private update(partial: Partial<PipelineState>) {
    Object.assign(this.state, partial);
    this.emit();
  }

  getState(): PipelineState {
    return { ...this.state };
  }

  /**
   * Run the full production pipeline on a transcript
   */
  async produce(transcript: string, audioFile?: string, videoFile?: string): Promise<EpisodePackage> {
    const recordedAt = new Date().toISOString();

    try {
      // Stage 1: Transcription (already done if transcript provided)
      this.update({
        stage: 'transcribing',
        progress: 10,
        message: 'Processing transcript...',
        episode: { transcript, recordedAt, audioFile, videoFile },
      });

      // Stage 2: Generate title
      this.update({
        stage: 'generating_title',
        progress: 20,
        message: 'AI is crafting your episode title...',
      });
      const title = await generateEpisodeTitle(transcript, this.model);
      this.update({
        progress: 35,
        episode: { ...this.state.episode, title },
      });

      // Stage 3: Generate description
      this.update({
        stage: 'generating_description',
        progress: 40,
        message: 'Writing episode description...',
      });
      const description = await generateEpisodeDescription(transcript, title, this.model);
      this.update({
        progress: 55,
        episode: { ...this.state.episode, description },
      });

      // Stage 4: Generate show notes
      this.update({
        stage: 'generating_show_notes',
        progress: 60,
        message: 'Compiling show notes...',
      });
      const showNotes = await generateShowNotes(transcript, this.model);
      this.update({
        progress: 70,
        episode: { ...this.state.episode, showNotes },
      });

      // Stage 5: Generate social posts
      this.update({
        stage: 'generating_social',
        progress: 75,
        message: 'Creating social media posts...',
      });
      const socialPosts = await generateSocialPosts(title, description, this.model);
      this.update({
        progress: 85,
        episode: { ...this.state.episode, socialPosts },
      });

      // Stage 6: Generate branded thumbnail
      this.update({
        stage: 'generating_thumbnail',
        progress: 90,
        message: 'Generating branded thumbnail...',
      });
      const thumbnailDataUrl = generateThumbnail({ title });
      let thumbnailFile = thumbnailDataUrl || undefined;

      // Save thumbnail to organized output folder
      if (thumbnailDataUrl) {
        try {
          const res = await fetch(thumbnailDataUrl);
          const blob = await res.blob();
          const slug = (title || 'episode').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 60);
          const savedPath = await saveBlob('thumbnails', `${slug}_thumbnail.png`, blob);
          console.log(`Thumbnail saved: ${savedPath}`);
          // Keep data URL for display, but also record path
          thumbnailFile = thumbnailDataUrl;
        } catch (saveErr) {
          console.warn('Could not save thumbnail to output folder:', saveErr);
        }
      }

      // Stage 7: Package
      this.update({
        stage: 'packaging',
        progress: 95,
        message: 'Packaging episode...',
      });

      const brand = getUserBranding();
      const episode: EpisodePackage = {
        title,
        description,
        showNotes,
        transcript,
        socialPosts,
        recordedAt,
        duration: 0,
        audioFile,
        videoFile,
        thumbnailFile,
        show: brand.podcastName,
        host: brand.hostName,
        organization: brand.organizationName,
      };

      this.update({
        stage: 'complete',
        progress: 100,
        message: 'Episode package complete!',
        episode,
      });

      return episode;

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.update({
        stage: 'error',
        message: `Pipeline error: ${msg}`,
        error: msg,
      });
      throw error;
    }
  }

  reset() {
    this.state = {
      stage: 'idle',
      progress: 0,
      message: 'Ready',
      episode: {},
    };
    this.emit();
  }
}
