import React, { useEffect, useSyncExternalStore } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GameProvider } from '../state/GameContext';
import { Shell } from '../components/Shell';
import { C } from '../components/ui';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { MotionProvider } from '../state/MotionContext';
import { PersonalizationAssetsProvider } from '../personalization/AssetsProvider';
import { DonationProvider } from '../support/DonationProvider';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  SplashScreen.setOptions({ duration: 250, fade: true });
}

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function Layout() {
  // Render the same loading shell on the server and on the first browser pass.
  // The responsive board is measured only after hydration; native is immediate.
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [loaded, error] = useFonts({ DM_400: DMSans_400Regular, DM_500: DMSans_500Medium, DM_600: DMSans_600SemiBold, DM_700: DMSans_700Bold, Serif: DMSerifDisplay_400Regular });
  useEffect(() => {
    if (Platform.OS !== 'web' && (loaded || error)) void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!hydrated || (!loaded && !error)) return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.green} /></View>;
  return <SafeAreaProvider><StatusBar style="dark" /><GameProvider><MotionProvider><PersonalizationAssetsProvider><FeedbackProvider><DonationProvider><Shell><Slot /></Shell></DonationProvider></FeedbackProvider></PersonalizationAssetsProvider></MotionProvider></GameProvider></SafeAreaProvider>;
}
