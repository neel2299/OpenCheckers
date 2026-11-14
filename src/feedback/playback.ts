export type PlaybackResult = 'played' | 'unavailable' | 'cancelled';
type Status = { isLoaded: boolean; error?: string | null };
export interface SoundPlayer {
  isLoaded: boolean;
  currentStatus: Status;
  volume: number;
  seekTo: (seconds: number) => Promise<void>;
  play: () => void;
  addListener: (event: 'playbackStatusUpdate', listener: (status: Status) => void) => { remove: () => void };
}

function waitForLoad(player: SoundPlayer, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    let listener: { remove: () => void } | undefined;
    const finish = (loaded: boolean) => {
      clearTimeout(timer);
      listener?.remove();
      signal.removeEventListener('abort', cancel);
      resolve(loaded);
    };
    const cancel = () => finish(false);
    const timer = setTimeout(() => finish(false), 5000);
    listener = player.addListener('playbackStatusUpdate', status => {
      if (status.error) finish(false);
      else if (status.isLoaded) finish(true);
    });
    signal.addEventListener('abort', cancel, { once: true });
    // Close the race between inspecting status and subscribing to updates.
    if (signal.aborted) finish(false);
    else if (player.isLoaded || player.currentStatus.isLoaded) finish(true);
  });
}

export async function replaySound(player: SoundPlayer, volume: number, signal: AbortSignal, wait = false): Promise<PlaybackResult> {
  try {
    if (signal.aborted) return 'cancelled';
    // Android's isLoaded getter excludes STATE_ENDED; its status correctly
    // reports that a completed clip remains loaded and can be replayed.
    if (!player.isLoaded && !player.currentStatus.isLoaded) {
      if (!wait || !await waitForLoad(player, signal)) return signal.aborted ? 'cancelled' : 'unavailable';
    }
    await player.seekTo(0);
    if (signal.aborted) return 'cancelled';
    player.volume = volume;
    player.play();
    return 'played';
  } catch { return signal.aborted ? 'cancelled' : 'unavailable'; }
}
