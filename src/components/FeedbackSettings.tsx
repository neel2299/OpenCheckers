import React from 'react';
import { View, Switch } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { useGame } from '../state/GameContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import { useMotion } from '../hooks/useMotion';
import { Body, Button, C, Card, Heading, Label, Pill, s } from './ui';

export function FeedbackSettings() {
  const { preferences, setPreferences } = useGame();
  const { play } = useFeedback();
  const { reduced } = useMotion();
  return <Card><Heading style={{ fontSize: 19 }}>Sound & motion</Heading>
    {[
      { key: 'sound' as const, title: 'Sound effects', description: 'Move taps, captures, crowning, and the victory bell.' },
      { key: 'haptics' as const, title: 'Haptic feedback', description: 'Gentle vibration on supported phones.' },
      { key: 'animations' as const, title: 'Piece animations', description: reduced ? 'Your device’s Reduce Motion setting is on.' : 'Animate moves, captures, and crowning.' },
    ].map(({ key, title, description }) => <View key={key} style={[s.between, { gap: 12, minHeight: 82, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }]}><View style={{ flex: 1 }}><Body style={{ fontFamily: 'DM_600' }}>{title}</Body><Body style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{description}</Body></View><Switch accessibilityLabel={title} value={preferences[key]} onValueChange={value => setPreferences(current => ({ ...current, [key]: value }))} trackColor={{ false: '#DDE2D5', true: '#6F8C5F' }} thumbColor="white" /></View>)}
    <Label style={{ marginTop: 18, marginBottom: 10 }}>Sound volume</Label><View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 12, padding: 4, gap: 3 }}>{[0.25, 0.5, 0.75, 1].map(volume => <Pill key={volume} selected={preferences.volume === volume} onPress={() => setPreferences(current => ({ ...current, volume }))}>{volume * 100}%</Pill>)}</View>
    <Button icon={Volume2} secondary onPress={() => play('promotion')} disabled={!preferences.sound || preferences.volume === 0} style={{ marginTop: 14 }}>Preview sound</Button>
    <Button icon={Volume2} secondary onPress={() => play('victory')} disabled={!preferences.sound || preferences.volume === 0} style={{ marginTop: 8 }}>Preview victory bell</Button>
    <Body style={{ fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 12 }}>Sounds stop when you leave the app. Animations follow Reduce Motion.</Body>
  </Card>;
}
