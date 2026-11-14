import React, { useEffect, useState } from 'react';
import { Animated, Platform } from 'react-native';
import type { Piece } from '../../game/engine';
import { Disc } from './Disc';

export function SelectablePiece({ piece, size, selected, motion }: { piece: Piece; size: number; selected: boolean; motion: boolean }) {
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!motion) { lift.setValue(0); return; }
    const animation = Animated.spring(lift, { toValue: selected ? 1 : 0, speed: 28, bounciness: 5, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [selected, motion, lift]);
  return <Animated.View pointerEvents="none" style={{ transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.08] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}><Disc piece={piece} size={size} selected={selected} /></Animated.View>;
}
