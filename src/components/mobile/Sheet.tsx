import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMotion } from '../../hooks/useMotion';
import { Body, C, Heading, IconButton } from '../ui';

export function Sheet({ title, subtitle, onClose, children, footer, tall = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { enabled } = useMotion();
  return <Modal visible transparent animationType={enabled ? 'slide' : 'none'} onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${title}`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal accessibilityLabel={title} style={[styles.sheet, { maxHeight: height - insets.top - 12, height: Math.min(tall ? height * 0.92 : height * 0.78, 800), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.handle} />
        <View style={styles.header}><View style={{ flex: 1 }}><Heading style={{ fontSize: 22 }}>{title}</Heading>{subtitle && <Body style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{subtitle}</Body>}</View><IconButton icon={X} label={`Close ${title.toLowerCase()}`} onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>{children}</ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,30,22,0.42)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 600, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 4, backgroundColor: '#CCD6C8', marginTop: 9 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderColor: C.line },
  body: { padding: 16, gap: 14 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderColor: C.line },
});
