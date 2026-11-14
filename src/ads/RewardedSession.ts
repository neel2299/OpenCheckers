export type AdStage = 'idle' | 'preparing' | 'loading' | 'ready' | 'showing' | 'earned' | 'skipped' | 'error';
export interface RewardedPort {
  subscribe(events: { loaded: () => void; earned: () => void; closed: () => void; error: () => void }): () => void;
  load(): void;
  show(): Promise<void>;
  destroy(): void;
}
type SessionOptions = { prepare: (active: () => boolean) => Promise<void>; create: () => RewardedPort; change: (stage: AdStage, message?: string) => void; reward: () => void };

// One session owns one ad. Loading never opens it; showing requires another tap.
export class RewardedSession {
  stage: AdStage = 'idle';
  private port?: RewardedPort;
  private unsubscribe?: () => void;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private rewarded = false;
  private loadedAt = 0;
  private options: SessionOptions;
  constructor(options: SessionOptions) { this.options = options; }
  private change(stage: AdStage, message?: string) {
    this.stage = stage;
    if (!this.disposed) this.options.change(stage, message);
  }
  private cleanup() {
    clearTimeout(this.timer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.port?.destroy();
    this.port = undefined;
  }
  private fail(message = 'No ad is available right now. Check your connection and try again later.') {
    this.cleanup();
    this.change(this.rewarded ? 'earned' : 'error', message);
  }
  async load() {
    if (this.disposed || this.stage !== 'idle') return;
    this.change('preparing');
    let preparing = true;
    try {
      await this.options.prepare(() => !this.disposed);
      if (this.disposed) return;
      preparing = false;
      this.port = this.options.create();
      this.unsubscribe = this.port.subscribe({
        loaded: () => {
          if (this.disposed || this.stage !== 'loading') return;
          clearTimeout(this.timer);
          this.loadedAt = Date.now();
          this.change('ready');
        },
        earned: () => {
          if (this.stage !== 'showing' || this.rewarded) return;
          this.rewarded = true;
          this.options.reward();
        },
        closed: () => { if (this.stage === 'showing') { this.cleanup(); this.change(this.rewarded ? 'earned' : 'skipped'); } },
        error: () => { if (this.port) this.fail(); },
      });
      this.change('loading');
      this.timer = setTimeout(() => this.fail('The ad took too long to load. Please try again later.'), 45000);
      this.port.load();
    } catch (error) {
      this.fail(preparing && error instanceof Error ? error.message : undefined);
    }
  }
  async show() {
    if (this.disposed || this.stage !== 'ready' || !this.port) return;
    if (Date.now() - this.loadedAt >= 55 * 60 * 1000) { this.fail('This ad has expired. Load another ad when you are ready.'); return; }
    this.change('showing');
    try { await this.port.show(); } catch { this.fail(); }
  }
  dispose() {
    this.disposed = true;
    // Keep the earned callback alive if navigation occurs while the native ad
    // is presenting. A completed view must still receive its promised reward.
    if (this.stage !== 'showing') this.cleanup();
  }
}
