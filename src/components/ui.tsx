import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export const C = { bg: '#F3F5F1', paper: '#FFFFFF', ink: '#20382D', muted: '#647368', line: '#DFE6DC', green: '#285740', pale: '#E7EFE3', lime: '#D5E5AF', coral: '#C97058', soft: '#F0F3ED' };
export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: 'DM_600', fontSize: 12, letterSpacing: 0.4, color: C.muted }, style]}>{children}</Text>;
}
export function Body({ children, style, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: 'DM_400', fontSize: 14, lineHeight: 21, color: C.ink }, style]}>{children}</Text>;
}
export function Heading({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: 'DM_700', fontSize: 24, lineHeight: 30, color: C.ink }, style]}>{children}</Text>;
}
export function Button({ children, onPress, icon: Icon, secondary, disabled, style, label }: { children: React.ReactNode; onPress: () => void; icon?: LucideIcon; secondary?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed, hovered }: any) => [s.button, secondary && s.secondary, (pressed || hovered) && { opacity: 0.83 }, disabled && { opacity: 0.4 }, style]}>
    {Icon && <Icon size={17} color={secondary ? C.green : '#fff'} strokeWidth={1.7} />}
    <Text style={{ fontFamily: 'DM_600', fontSize: 13, color: secondary ? C.green : '#fff' }}>{children}</Text>
  </Pressable>;
}
export function IconButton({ icon: Icon, label, onPress, disabled, active }: { icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed, hovered }: any) => [s.iconButton, active && { backgroundColor: C.pale }, (pressed || hovered) && { backgroundColor: C.soft }, disabled && { opacity: 0.25 }]}><Icon size={18} strokeWidth={1.6} color={C.green} /></Pressable>;
}
export function Pill({ children, selected, onPress, style }: { children: React.ReactNode; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }: any) => [s.pill, selected && s.pillSelected, pressed && { opacity: 0.7 }, style]}><Text style={{ fontFamily: selected ? 'DM_600' : 'DM_400', fontSize: 12, color: selected ? C.green : C.muted }}>{children}</Text></Pressable>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.card, style]}>{children}</View>; }
export const s = StyleSheet.create({
  card: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 17 },
  button: { minHeight: 48, backgroundColor: C.green, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  secondary: { backgroundColor: C.paper, borderWidth: 1, borderColor: '#DDE2D6' },
  iconButton: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, flex: 1 },
  pillSelected: { backgroundColor: 'white', boxShadow: '0px 1px 4px rgba(30,50,35,0.07)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 21 },
});
