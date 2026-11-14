import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bot, Check, Clock, Play, UsersRound } from 'lucide-react-native';
import { useGame, type GameConfig } from '../../state/GameContext';
import { LEVELS, VARIANTS, computerLevel, sideName } from '../../game/variants';
import { levelRecord } from '../../game/records';
import { Body, Button, C, Label } from '../ui';
import { MiniBoard } from '../GamePanels';
import { Disc } from '../Board';
import { Sheet } from './Sheet';
import { OpponentAvatar } from '../OpponentAvatar';

const TIME_CONTROLS = [
  { minutes: 0, label: 'Untimed', note: 'Relaxed play' },
  { minutes: 3, label: '3 min', note: 'Blitz' },
  { minutes: 5, label: '5 min', note: 'Rapid' },
  { minutes: 10, label: '10 min', note: 'Classical' },
] as const;

export function GameSetupSheet({ config, start, close }: { config: GameConfig; start: (config: GameConfig) => void; close: () => void }) {
  const [draft, setDraft] = useState<GameConfig>({ timeControl: 0, ...config });
  const { archive, ratings } = useGame();
  return <Sheet title="New game" subtitle="Choose a variant, opponent, time control, and level." onClose={close} tall footer={<Button icon={Play} onPress={() => start(draft)}>Start a new game</Button>}>
    <Label>Opponent</Label>
    <View style={styles.row}>{([{ mode: 'computer', title: 'Computer', icon: Bot }, { mode: 'friend', title: '2 players', icon: UsersRound }] as const).map(({ mode, title, icon: Icon }) => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ selected: draft.mode === mode }} onPress={() => setDraft({ ...draft, mode })} style={[styles.choice, { flex: 1 }, draft.mode === mode && styles.selected]}><Icon size={20} color={C.green} /><Text style={styles.name}>{title}</Text>{draft.mode === mode && <Check size={16} color={C.green} />}</Pressable>)}</View>
    {draft.mode === 'friend' && <Body style={styles.note}>Take turns on the same phone. No connection needed.</Body>}
    <Label>Checkers variant</Label>
    <View style={styles.grid}>{Object.values(VARIANTS).map(variant => <Pressable key={variant.id} accessibilityRole="radio" accessibilityLabel={`${variant.name}, ${variant.size} by ${variant.size}`} accessibilityState={{ checked: draft.variant === variant.id }} aria-checked={draft.variant === variant.id} onPress={() => setDraft({ ...draft, variant: variant.id })} style={[styles.choice, styles.half, draft.variant === variant.id && styles.selected]}><MiniBoard size={variant.size} active={draft.variant === variant.id} /><View style={{ flex: 1 }}><Text style={styles.name}>{variant.name}</Text><Body style={styles.note}>{variant.size} × {variant.size} board</Body></View></Pressable>)}</View>
    <Label>Time control</Label>
    <View style={styles.row}>{TIME_CONTROLS.map(tc => {
      const active = (draft.timeControl ?? 0) === tc.minutes;
      return <Pressable key={tc.minutes} accessibilityRole="radio" accessibilityLabel={`Time control ${tc.label}`} accessibilityState={{ checked: active }} aria-checked={active} onPress={() => setDraft({ ...draft, timeControl: tc.minutes })} style={[styles.timeChoice, active && styles.selected]}>
        <View style={styles.timeRow}>{tc.minutes > 0 && <Clock size={13} color={C.green} />}<Text style={styles.name}>{tc.label}</Text></View>
        <Body style={styles.note}>{tc.note}</Body>
      </Pressable>;
    })}</View>
    {draft.mode === 'computer' && <><Label>Meet your opponent · estimated Elo</Label><Body style={styles.note}>Your {VARIANTS[draft.variant].name} rating: {ratings[draft.variant].value}</Body><View style={styles.grid}>{LEVELS.map(level => {
      const record = levelRecord(archive, draft.variant, level.elo);
      return <Pressable key={level.elo} accessibilityRole="radio" accessibilityLabel={`Computer level ${level.elo} Elo, ${level.name}`} accessibilityState={{ checked: level.elo === draft.elo }} aria-checked={level.elo === draft.elo} onPress={() => setDraft({ ...draft, elo: level.elo })} style={[styles.level, styles.half, draft.elo === level.elo && styles.selected]}><View style={styles.row}><OpponentAvatar elo={level.elo} size={34} /><Text style={[styles.name, { fontSize: 16, flex: 1 }]}>{level.name}</Text>{draft.elo === level.elo && <Check size={17} color={C.green} />}</View><Body style={[styles.note, { marginTop: 5 }]}>{level.title} · ~{level.elo}</Body><Body style={[styles.note, { marginTop: 5 }]}>{record.played ? `${record.wins}W · ${record.draws}D · ${record.losses}L` : 'Your first meeting'}</Body></Pressable>;
    })}</View><Body style={styles.note}>{computerLevel(draft.elo).personality}</Body></>}
    <Label>{draft.mode === 'computer' ? 'Your pieces' : 'Board perspective'}</Label>
    <View style={styles.row}>{(['white', 'black'] as const).map(side => <Pressable key={side} accessibilityRole="radio" accessibilityLabel={`Play as ${sideName(side)}`} accessibilityState={{ checked: draft.side === side }} aria-checked={draft.side === side} onPress={() => setDraft({ ...draft, side })} style={[styles.choice, { flex: 1 }, draft.side === side && styles.selected]}><Disc piece={{ side, king: false }} size={26} /><Text style={styles.name}>{sideName(side)}</Text></Pressable>)}</View>
    <Body style={styles.note}>Starting a new game replaces your current game. Analyze it first to keep a study copy.</Body>
  </Sheet>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48%', flexGrow: 1 },
  choice: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.paper },
  timeChoice: { flex: 1, minHeight: 54, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 2 },
  selected: { backgroundColor: C.pale, borderColor: '#91AC84' },
  level: { padding: 12, minHeight: 68, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  name: { fontFamily: 'DM_600', fontSize: 14, color: C.ink },
  note: { fontSize: 12, lineHeight: 18, color: C.muted },
});
