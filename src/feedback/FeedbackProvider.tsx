import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useGame } from '../state/GameContext';
import type { FeedbackCue } from './events';
import { useMediaUri } from '../personalization/AssetsProvider';
import type { BuiltinSound } from '../personalization/model';
import { replaySound, type PlaybackResult } from './playback';

const FeedbackContext = createContext<{ play: (cue: FeedbackCue) => void; preview: (cue: FeedbackCue) => Promise<PlaybackResult>; stop: () => void } | null>(null);
const SOURCES: Record<BuiltinSound, number> = {
  select: require('../../assets/sounds/select.wav'),
  move: require('../../assets/sounds/move.wav'),
  capture: require('../../assets/sounds/capture.wav'),
  promotion: require('../../assets/sounds/promotion.wav'),
  start: require('../../assets/sounds/start.wav'),
  finish: require('../../assets/sounds/finish.wav'),
  victory: require('../../assets/sounds/victory.wav'),
};
function useCueSource(cue: FeedbackCue): string | number | null {
  const { preferences } = useGame();
  const choice = preferences.personalization.sounds[cue];
  const uri = useMediaUri(choice.asset);
  const fallback = SOURCES[cue === 'undo' ? 'move' : cue];
  if (choice.source === 'custom') return uri === undefined ? null : uri ?? fallback;
  return choice.source === 'default' || choice.source === 'mute' ? fallback : SOURCES[choice.source];
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { preferences, ready } = useGame();
  const selectSource = useCueSource('select'), moveSource = useCueSource('move'), captureSource = useCueSource('capture'), promotionSource = useCueSource('promotion');
  const startSource = useCueSource('start'), finishSource = useCueSource('finish'), victorySource = useCueSource('victory'), undoSource = useCueSource('undo');
  const selection = useAudioPlayer(selectSource);
  const move = useAudioPlayer(moveSource);
  const capture = useAudioPlayer(captureSource);
  const promotion = useAudioPlayer(promotionSource);
  const start = useAudioPlayer(startSource);
  const finish = useAudioPlayer(finishSource);
  const victory = useAudioPlayer(victorySource);
  const undo = useAudioPlayer(undoSource);
  const players = useMemo(() => ({ select: selection, move, capture, promotion, start, finish, victory, undo }), [selection, move, capture, promotion, start, finish, victory, undo]);
  const active = useRef(AppState.currentState === 'active');
  const sourceKey = JSON.stringify([selectSource, moveSource, captureSource, promotionSource, startSource, finishSource, victorySource, undoSource]);
  const latest = useRef({ preferences, ready });
  const playback = useRef(new AbortController());
  const invalidatePlayback = useCallback(() => { playback.current.abort(); playback.current = new AbortController(); }, []);

  useEffect(() => { latest.current = { preferences, ready }; }, [preferences, ready]);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    const listener = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      if (!active.current) {
        invalidatePlayback();
        Object.values(players).forEach(player => player.pause());
      }
    });
    return () => { invalidatePlayback(); listener.remove(); };
  }, [players, invalidatePlayback]);
  useEffect(() => {
    invalidatePlayback();
    Object.entries(players).forEach(([cue, player]) => {
      player.volume = preferences.volume * preferences.personalization.sounds[cue as FeedbackCue].volume;
      player.pause();
    });
  }, [players, preferences.sound, preferences.volume, preferences.personalization.sounds, sourceKey, invalidatePlayback]);

  const stop = useCallback(() => {
    invalidatePlayback();
    Object.values(players).forEach(player => { try { player.pause(); } catch { /* A replaced player may already be released. */ } });
  }, [players, invalidatePlayback]);

  const playSound = useCallback((cue: FeedbackCue, wait = false): Promise<PlaybackResult> => {
    const { preferences: settings, ready: loaded } = latest.current;
    const choice = settings.personalization.sounds[cue];
    const player = players[cue];
    if (!loaded || !active.current || !settings.sound || settings.volume <= 0 || choice.source === 'mute' || choice.volume <= 0) return Promise.resolve('unavailable');
    return replaySound(player, settings.volume * choice.volume, playback.current.signal, wait);
  }, [players]);

  const play = useCallback((cue: FeedbackCue) => {
    const { preferences: settings, ready: loaded } = latest.current;
    if (!loaded || !active.current) return;
    void playSound(cue);
    if (settings.haptics && Platform.OS !== 'web') {
      const important = cue === 'capture' || cue === 'promotion' || cue === 'finish' || cue === 'victory';
      const operation = Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(important ? Haptics.AndroidHaptics.Confirm : Haptics.AndroidHaptics.Segment_Tick)
        : important ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync();
      void operation.catch(() => {});
    }
  }, [playSound]);

  const preview = useCallback((cue: FeedbackCue) => { stop(); return playSound(cue, true); }, [stop, playSound]);

  return <FeedbackContext.Provider value={{ play, preview, stop }}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('FeedbackProvider is required.');
  return context;
}
