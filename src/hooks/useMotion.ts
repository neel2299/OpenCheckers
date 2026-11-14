import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useGame } from '../state/GameContext';
import { useReducedMotion } from '../state/MotionContext';

export function useMotion() {
  const { preferences } = useGame();
  const reduced = useReducedMotion();
  return { enabled: preferences.animations && !reduced, reduced };
}

export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  return active;
}
