import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { C } from '../ui';

export function Action({ icon: Icon, title, label, onPress, disabled, compact, active, danger }: { icon: LucideIcon; title: string; label?: string; onPress: () => void; disabled?: boolean; compact?: boolean; active?: boolean; danger?: boolean }) {
  const color = danger ? '#AE4E3D' : C.green;
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, compact && styles.compact, active && { backgroundColor: C.pale, borderColor: '#A8BE9E' }, disabled && { opacity: 0.38 }, pressed && { opacity: 0.65 }]}>
    <Icon size={compact ? 17 : 22} color={color} strokeWidth={1.9} /><Text numberOfLines={1} style={[styles.title, { color }, compact && { fontSize: 12 }]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  action: { flex: 1, minWidth: 0, minHeight: 62, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 5 },
  compact: { minHeight: 44, flexDirection: 'row', gap: 6, backgroundColor: 'transparent', borderColor: 'transparent' },
  title: { fontFamily: 'DM_600', fontSize: 12 },
});
