import React, { useEffect, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { useMotion } from '../hooks/useMotion';
import { Body, C } from './ui';

export function AnimatedToast({ message }: { message: string }) {
  const { enabled } = useMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) { progress.setValue(1); return; }
    const animation = Animated.spring(progress, { toValue: 1, speed: 22, bounciness: 4, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [enabled, progress]);
  return <Animated.View accessibilityLiveRegion="polite" pointerEvents="none" style={{ position: 'absolute', top: 0, alignSelf: 'center', backgroundColor: C.green, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, maxWidth: '95%', boxShadow: '0px 6px 20px rgba(30,50,35,0.15)', opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}><Body style={{ color: 'white', fontSize: 12 }}>{message}</Body></Animated.View>;
}
