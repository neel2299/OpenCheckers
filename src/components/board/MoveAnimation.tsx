import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import type { BoardTransition } from '../../game/transition';
import { Disc } from './Disc';
import { useGame } from '../../state/GameContext';
import { contrastText } from '../../personalization/Surfaces';

const nativeDriver = Platform.OS !== 'web';
export function MoveAnimation({ transition, size, tile, flipped, onComplete }: { transition: BoardTransition; size: number; tile: number; flipped: boolean; onComplete: () => void }) {
  const { preferences } = useGame();
  const point = (square: number) => {
    const row = Math.floor(square / size), col = square % size;
    return { x: (flipped ? size - 1 - col : col) * tile, y: (flipped ? size - 1 - row : row) * tile };
  };
  const [offset] = useState(() => new Animated.ValueXY(point(transition.path[0])));
  const [captureFade] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));
  const [crown] = useState(() => new Animated.Value(0));
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const steps = transition.path.slice(1).map(square => Animated.timing(offset, { toValue: point(square), duration: transition.captured.length ? 125 : 190, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false }));
    if (transition.promotes) steps.push(Animated.parallel([
      Animated.timing(crown, { toValue: 1, duration: 120, useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 90, useNativeDriver: nativeDriver, isInteraction: false }),
        Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 5, useNativeDriver: nativeDriver, isInteraction: false }),
      ]),
    ]));
    const animation = Animated.parallel([
      Animated.sequence(steps),
      Animated.timing(captureFade, { toValue: 0, duration: 180, useNativeDriver: nativeDriver, isInteraction: false }),
    ]);
    animation.start(({ finished }) => { if (finished) onCompleteRef.current(); });
    return () => animation.stop();
    // Geometry is immutable for this keyed animation. Resizing or flipping unmounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition, offset, captureFade, scale, crown]);

  return <View testID="piece-move-animation" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', inset: 0 }}>
    {transition.captured.map(({ square, piece }) => {
      const { x, y } = point(square);
      return <Animated.View key={square} style={{ position: 'absolute', left: x, top: y, width: tile, height: tile, justifyContent: 'center', alignItems: 'center', opacity: captureFade, transform: [{ scale: captureFade.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }] }}><Disc piece={piece} size={tile * 0.73} /></Animated.View>;
    })}
    <Animated.View style={{ position: 'absolute', width: tile, height: tile, alignItems: 'center', justifyContent: 'center', transform: [...offset.getTranslateTransform(), { scale }] }}>
      <Disc piece={transition.piece} size={tile * 0.73} />
      {transition.promotes && <Animated.View style={{ position: 'absolute', opacity: crown, transform: [{ translateY: -2 }] }}><Crown size={tile * 0.33} color={contrastText(preferences.personalization.pieces[transition.piece.side])} strokeWidth={1.8} /></Animated.View>}
    </Animated.View>
  </View>;
}
