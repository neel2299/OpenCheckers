import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Crown } from 'lucide-react-native';
import { applyRoyalClub, ROYAL_PALETTE } from '../ads/rewards';
import { useGame } from '../state/GameContext';
import { TextureLayer } from '../personalization/Surfaces';
import { Body, Button, C, Heading, Label } from './ui';

export function RoyalClubReward() {
  const { ready, setPreferences } = useGame();
  const [applied, setApplied] = useState(false);
  return <View accessibilityLiveRegion="polite" testID="royal-club-reward" style={styles.card}>
    <View style={styles.row}><Crown size={23} color="#896829" /><Label>AVAILABLE TO EVERYONE</Label></View>
    <View style={styles.preview} accessible accessibilityLabel="Royal Club preview: emerald and ivory squares with a gold diamond finish">
      {Array.from({ length: 8 }, (_, index) => <View key={index} style={{ width: '25%', height: 40, backgroundColor: (Math.floor(index / 4) + index % 4) % 2 ? ROYAL_PALETTE.dark : ROYAL_PALETTE.light }}><TextureLayer texture="royal" opacity={0.5} /></View>)}
    </View>
    <Heading style={{ fontSize: 20 }}>Royal Club</Heading>
    <Body style={styles.copy}>Enjoy the emerald-and-gold board and Royal texture for free.</Body>
    <Button secondary disabled={!ready} icon={applied ? Check : Crown} onPress={() => { setPreferences(current => ({ ...current, personalization: applyRoyalClub(current.personalization) })); setApplied(true); }}>Apply Royal Club</Button>
    {applied && <Body style={styles.copy}>Royal Club applied. Your other personalization choices are saved.</Body>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: '#D7C28F', borderRadius: 14, backgroundColor: '#FCF7EA', gap: 12 },
  row: { flexDirection: 'row', gap: 9, alignItems: 'center', flexWrap: 'wrap' },
  copy: { color: C.muted, fontSize: 12, lineHeight: 18 },
  preview: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', borderRadius: 10, borderWidth: 4, borderColor: ROYAL_PALETTE.frame },
});
