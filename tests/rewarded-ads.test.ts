import assert from 'node:assert/strict';
import test from 'node:test';
import { RewardedSession, type AdStage, type RewardedPort } from '../src/ads/RewardedSession.ts';
import { applyRoyalClub, restoreRewards } from '../src/ads/rewards.ts';
import { defaultPersonalization, restorePersonalization } from '../src/personalization/model.ts';

function harness(prepare: (active: () => boolean) => Promise<void> = async () => {}) {
  let events!: Parameters<RewardedPort['subscribe']>[0];
  let grants = 0, shows = 0, loads = 0, destroyed = 0, subscribed = 0;
  const states: AdStage[] = [];
  const session = new RewardedSession({
    prepare,
    create: () => ({
      subscribe: handlers => { events = handlers; subscribed++; return () => { subscribed--; }; },
      load: () => { loads++; }, show: async () => { shows++; }, destroy: () => { destroyed++; },
    }),
    change: stage => { states.push(stage); }, reward: () => { grants++; },
  });
  return { session, states, get events() { return events; }, get counts() { return { grants, shows, loads, destroyed, subscribed }; } };
}
test('loading requires explicit show and neither load nor close grants a reward', async () => {
  const h = harness(); await h.session.load(); await h.session.load();
  assert.equal(h.counts.loads, 1); h.events.loaded();
  assert.equal(h.session.stage, 'ready'); assert.equal(h.counts.shows, 0);
  await h.session.show(); await h.session.show();
  h.events.closed();
  assert.equal(h.session.stage, 'skipped');
  assert.deepEqual(h.counts, { grants: 0, shows: 1, loads: 1, destroyed: 1, subscribed: 0 });
});
test('earned event grants exactly once, immediately before close', async () => {
  const h = harness(); await h.session.load(); h.events.loaded();
  h.events.earned(); assert.equal(h.counts.grants, 0);
  await h.session.show(); h.events.earned(); h.events.earned();
  assert.equal(h.counts.grants, 1); h.events.closed();
  assert.equal(h.session.stage, 'earned'); h.events.earned();
  assert.equal(h.counts.grants, 1);
});
test('load failures release listeners and never give a reward', async () => {
  const h = harness(); await h.session.load(); h.events.error(); h.events.loaded(); h.events.earned();
  assert.equal(h.session.stage, 'error'); assert.equal(h.counts.grants, 0);
  assert.equal(h.counts.subscribed, 0); assert.equal(h.counts.destroyed, 1);
  h.session.dispose(); assert.equal(h.counts.destroyed, 1);
});
test('canceling preparation prevents creating or loading an ad', async () => {
  let finish!: () => void; let active!: () => boolean;
  const h = harness(check => { active = check; return new Promise<void>(resolve => { finish = resolve; }); });
  const loading = h.session.load(); h.session.dispose();
  assert.equal(active(), false); finish(); await loading;
  assert.equal(h.counts.loads, 0); assert.equal(h.counts.subscribed, 0);
  assert.deepEqual(h.states, ['preparing']);
});
test('leaving a loaded placement destroys the ad without showing it', async () => {
  const h = harness(); await h.session.load(); h.events.loaded(); h.session.dispose(); await h.session.show();
  assert.equal(h.counts.shows, 0); assert.equal(h.counts.destroyed, 1);
});
test('earned reward survives navigation while native ad is open', async () => {
  const h = harness(); await h.session.load(); h.events.loaded(); await h.session.show();
  h.session.dispose(); h.events.earned(); h.events.closed();
  assert.equal(h.counts.grants, 1); assert.equal(h.counts.destroyed, 1);
  assert.deepEqual(h.states, ['preparing', 'loading', 'ready', 'showing']);
});
test('consent failure cannot create an ad or grant a reward', async () => {
  const h = harness(async () => { throw new Error('Privacy setup unavailable'); });
  await h.session.load(); assert.equal(h.session.stage, 'error');
  assert.equal(h.counts.loads, 0); assert.equal(h.counts.grants, 0);
});
test('reward restoration is strict and applying the finish only replaces board surfaces', () => {
  for (const invalid of [undefined, null, true, { royalClub: 'true' }, { royalClub: 1 }]) assert.deepEqual(restoreRewards(invalid), { royalClub: false });
  assert.deepEqual(restoreRewards({ royalClub: true }), { royalClub: true });
  const original = defaultPersonalization(); original.background.color = '#123456'; original.sounds.move.source = 'capture';
  const royal = applyRoyalClub(original);
  assert.equal(royal.board.texture, 'royal'); assert.equal(royal.background, original.background); assert.equal(royal.sounds, original.sounds);
  assert.equal(original.board.texture, 'none');
  assert.equal(restorePersonalization(JSON.parse(JSON.stringify(royal))).board.texture, 'royal');
});
