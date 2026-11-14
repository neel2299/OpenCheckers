import assert from 'node:assert/strict';
import test from 'node:test';
import { replaySound, type SoundPlayer } from '../src/feedback/playback.ts';

function sound(loaded = true) {
  const calls: string[] = [];
  let notify: (status: { isLoaded: boolean; error?: string }) => void = () => {};
  let subscribed = false;
  const player: SoundPlayer = {
    isLoaded: loaded, currentStatus: { isLoaded: loaded }, volume: 1,
    seekTo: async seconds => { calls.push(`seek:${seconds}`); },
    play: () => { calls.push('play'); },
    addListener: (_, listener) => { notify = listener; subscribed = true; return { remove: () => { subscribed = false; } }; },
  };
  return { player, calls, notify: (status: Parameters<typeof notify>[0]) => notify(status), get subscribed() { return subscribed; } };
}

test('completed Android sounds replay repeatedly even when the isLoaded getter is false', async () => {
  const s = sound();
  s.player.isLoaded = false; // Android STATE_ENDED; currentStatus still reports loaded.
  for (let attempt = 0; attempt < 3; attempt++) assert.equal(await replaySound(s.player, 0.375, new AbortController().signal), 'played');
  assert.deepEqual(s.calls, ['seek:0', 'play', 'seek:0', 'play', 'seek:0', 'play']);
  assert.equal(s.player.volume, 0.375);
});

test('a preview waits for initial loading and plays without needing another tap', async () => {
  const s = sound(false);
  const result = replaySound(s.player, 0.5, new AbortController().signal, true);
  assert.equal(s.subscribed, true);
  assert.deepEqual(s.calls, []);
  s.notify({ isLoaded: true });
  assert.equal(await result, 'played');
  assert.equal(s.subscribed, false);
});

test('closing a preview or backgrounding cancels pending playback and releases its listener', async () => {
  const s = sound(false), controller = new AbortController();
  const result = replaySound(s.player, 1, controller.signal, true);
  controller.abort();
  s.notify({ isLoaded: true });
  assert.equal(await result, 'cancelled');
  assert.equal(s.subscribed, false);
  assert.deepEqual(s.calls, []);
});

test('source changes during seeking cannot start an obsolete sound', async () => {
  const s = sound(), controller = new AbortController();
  const result = replaySound(s.player, 1, controller.signal);
  controller.abort();
  assert.equal(await result, 'cancelled');
  assert.deepEqual(s.calls, ['seek:0']);
});

test('load and seek errors report unavailable without attempting playback', async () => {
  const s = sound(false);
  const result = replaySound(s.player, 1, new AbortController().signal, true);
  s.notify({ isLoaded: false, error: 'Unsupported audio' });
  assert.equal(await result, 'unavailable');
  assert.equal(s.subscribed, false);
  s.player.isLoaded = true;
  s.player.seekTo = async () => { throw new Error('Released player'); };
  assert.equal(await replaySound(s.player, 1, new AbortController().signal), 'unavailable');
  assert.deepEqual(s.calls, []);
});
