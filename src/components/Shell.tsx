import React from 'react';
import { Image, View, Text, StyleSheet, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { BookOpen, ChartNoAxesCombined, CircleHelp, GraduationCap, Settings2, Swords } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../state/GameContext';
import { TutorialSheet } from './TutorialSheet';
import { C, IconButton } from './ui';
import { AppBackground } from '../personalization/Surfaces';

const tabs = [
  { name: 'Play', title: 'Play checkers', path: '/', icon: Swords },
  { name: 'Analysis', title: 'Analysis board', path: '/analysis', icon: ChartNoAxesCombined },
  { name: 'Learn', title: 'Rules & help', path: '/learn', icon: BookOpen },
  { name: 'Settings', title: 'Settings', path: '/settings', icon: Settings2 },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { openTutorial } = useGame();
  const learning = ['/learn', '/puzzles', '/puzzle', '/history'].includes(path);
  const active = path === '/personalize' ? tabs[3] : learning ? tabs[2] : tabs.find(tab => tab.path === path) ?? tabs[0];
  const title = path === '/personalize' ? 'Make it yours' : path === '/puzzle' ? 'Solve a puzzle' : path === '/puzzles' ? 'Practice room' : path === '/history' ? 'Your club record' : active.title;
  return <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
    <AppBackground />
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: C.paper }} />
    <View style={styles.header}>
      <View style={styles.brand}><Image source={require('../../assets/brand.png')} style={styles.mark} resizeMode="contain" accessible accessibilityLabel="OpenCheckers logo" /><View style={{ flexShrink: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>OpenCheckers</Text></View></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <IconButton icon={GraduationCap} label="Open app tutorial" onPress={openTutorial} />
        <IconButton icon={path === '/settings' ? CircleHelp : Settings2} label={path === '/settings' ? 'Help and rules' : 'Open settings'} onPress={() => router.navigate(path === '/settings' ? '/learn' : '/settings')} />
      </View>
    </View>
    <View style={styles.content}>{children}</View>
    <TutorialSheet />
    <View accessibilityRole="tablist" style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {tabs.map(({ name, path: href, icon: Icon }) => {
        const selected = href === active.path;
        return <Pressable key={href} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{ selected }} aria-selected={selected} onPress={() => router.navigate(href)} style={({ pressed }) => [styles.tab, pressed && { opacity: 0.65 }]}>
          <View style={[styles.tabIcon, selected && { backgroundColor: C.pale }]}><Icon size={23} strokeWidth={selected ? 2.2 : 1.8} color={selected ? C.green : C.muted} /></View>
          <Text style={[styles.tabLabel, selected && { color: C.green, fontFamily: 'DM_700' }]}>{name}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { height: 58, paddingHorizontal: 16, backgroundColor: C.paper, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  mark: { width: 42, height: 42 },
  title: { fontFamily: 'DM_700', fontSize: 18, color: C.ink },
  subtitle: { fontFamily: 'DM_400', fontSize: 11, color: C.muted, marginTop: 1 },
  content: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  tabs: { flexDirection: 'row', paddingTop: 5, backgroundColor: C.paper, borderTopWidth: 1, borderColor: C.line },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { width: 56, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: 'DM_500', fontSize: 12, color: C.muted },
});
