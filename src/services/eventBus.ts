/**
 * Simple cross-component event bus for DSDS
 * Allows tabs to communicate without prop drilling
 */

type Listener<T = unknown> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);
    return () => { set.delete(listener as Listener); };
  }

  emit<T = unknown>(event: string, data: T): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(listener => listener(data));
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }
}

export const eventBus = new EventBus();

// Well-known events
export const EVENTS = {
  /** Fired when a recording session ends. Payload: transcript text */
  SESSION_TRANSCRIPT_READY: 'session:transcript-ready',
  /** Fired when a recording file is saved. Payload: { filename, duration } */
  RECORDING_SAVED: 'recording:saved',
} as const;
