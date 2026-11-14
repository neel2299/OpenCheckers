import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, History, Upload } from 'lucide-react-native';
import { router } from 'expo-router';
import { useGame, newTree } from '../state/GameContext';
import { createPosition } from '../game/engine';
import { VARIANTS } from '../game/variants';
import { Body, Button, C, Label } from './ui';
import { Sheet } from './mobile/Sheet';

export function NewAnalysisSheet({ close, importGame }: { close: () => void; importGame: () => void }) {
  const { savedAnalyses, activeAnalysis, selectAnalysis, newStudy } = useGame();
  return <Sheet title="New analysis" subtitle="Full-game requests are saved here. The five most recent requests are kept, including their variations." onClose={close} tall>
    <Button icon={Upload} onPress={importGame}>Import PDN game</Button>
    <Button secondary icon={History} onPress={() => { close(); router.navigate('/history'); }}>Choose a completed game</Button>
    <View style={styles.between}><Label>Saved analyses</Label><Label>{savedAnalyses.length} / 5</Label></View>
    {!savedAnalyses.length && <Body style={styles.note}>Request Computer analysis for a completed game or imported PDN to save your first analysis.</Body>}
    {savedAnalyses.map((item, index) => <Pressable key={item.id} testID="saved-analysis-item" accessibilityRole="button" accessibilityLabel={`Open saved analysis ${index + 1}`} onPress={() => { selectAnalysis(item.id); close(); }} style={[styles.item, item.id === activeAnalysis?.id && styles.selected]}>
      <View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text><Body style={styles.note}>{new Date(item.requestedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {item.mainLine.length - 1} half-moves</Body><Body style={styles.note}>{item.status === 'complete' ? 'Analysis complete' : `${Object.keys(item.cache.points).length} / ${item.mainLine.length} positions saved`}</Body></View>{item.id === activeAnalysis?.id && <Check size={18} color={C.green} />}
    </Pressable>)}
    <Label style={{ marginTop: 12 }}>Explore a position</Label>
    <Body style={styles.note}>Position boards have live evaluation. They do not use a full-game analysis slot.</Body>
    {Object.values(VARIANTS).map(variant => <Pressable key={variant.id} accessibilityRole="button" accessibilityLabel={`New ${variant.name} position`} onPress={() => { newStudy(newTree(createPosition(variant.id))); close(); }} style={styles.item}><Text style={styles.title}>{variant.name}</Text><Text style={styles.note}>{variant.size} × {variant.size}</Text></Pressable>)}
  </Sheet>;
}
const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  item: { minHeight: 56, padding: 13, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selected: { backgroundColor: C.pale, borderColor: '#A5BF95' },
  title: { fontFamily: 'DM_600', fontSize: 13, color: C.ink },
  note: { fontSize: 11, lineHeight: 17, color: C.muted },
});
