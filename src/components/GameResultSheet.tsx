import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChartNoAxesCombined, History, Plus, Puzzle, RotateCcw } from 'lucide-react-native';
import type { CompletedGame, Rating } from '../game/records';
import { computerLevel, sideName, VARIANTS } from '../game/variants';
import { OpponentAvatar } from './OpponentAvatar';
import { Sheet } from './mobile/Sheet';
import { Body, Button, C, Label } from './ui';

export function GameResultSheet({ entry, rating, close, analyze, history, puzzles, rematch, newGame }: {
  entry: CompletedGame;
  rating: Rating;
  close: () => void;
  analyze: () => void;
  history: () => void;
  puzzles: () => void;
  rematch: () => void;
  newGame: () => void;
}) {
  const computer = entry.mode === 'computer';
  const won = entry.winner === entry.userSide;
  const title = entry.winner === null ? 'A game well shared' : computer ? won ? 'A well-earned victory' : 'Your next move is to learn' : `${sideName(entry.winner)} takes the game`;
  const result = entry.winner === null ? 'Game drawn' : `${sideName(entry.winner)} wins`;
  const change = entry.ratingChange;
  return <Sheet title="Game over" subtitle={`${result} · ${entry.reason}`} onClose={close} tall footer={<Button secondary onPress={close}>Back to board</Button>}>
    <View style={styles.opponent}>
      {computer && <OpponentAvatar elo={entry.elo} size={56} />}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.title}>{title}</Text>
        <Body style={styles.note}>{computer ? `vs ${entry.opponentName ?? computerLevel(entry.elo).name} · ~${entry.elo} Elo` : 'Two players on this device'}</Body>
        <Body style={styles.note}>{VARIANTS[entry.variant].name} · {entry.moves} half-moves · {entry.timeControl ? `${entry.timeControl} min` : 'Untimed'}</Body>
      </View>
    </View>
    <View testID="game-result-rating" accessibilityLiveRegion="polite" style={styles.rating}>
      <Label style={{ color: C.lime }}>YOUR {VARIANTS[entry.variant].name.toUpperCase()} RATING</Label>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingValue}>{entry.ratingAfter ?? rating.value}</Text>
        {change !== undefined && <Text style={[styles.change, change < 0 && styles.loss]}>{change >= 0 ? '+' : ''}{change} Elo</Text>}
      </View>
      <Text style={styles.ratingNote}>{computer ? entry.ratingBefore !== undefined && entry.ratingAfter !== undefined ? `${entry.ratingBefore} → ${entry.ratingAfter} · Local computer rating` : 'Local computer rating' : 'Rating unchanged · Two-player game'}</Text>
      {computer && <Text style={styles.ratingNote}>{rating.games < 10 ? `Provisional · ${rating.games}/10 games` : `${rating.games} rated games`} · Peak {rating.peak}</Text>}
    </View>
    <Label>WHERE TO NEXT?</Label>
    <Button icon={ChartNoAxesCombined} onPress={analyze}>Analyze this game</Button>
    <View style={styles.row}>
      <Button secondary icon={History} onPress={history} style={styles.half}>Game history</Button>
      <Button secondary icon={Puzzle} onPress={puzzles} style={styles.half}>Puzzles</Button>
    </View>
    <View style={styles.row}>
      <Button secondary icon={RotateCcw} label="Play rematch" onPress={rematch} style={styles.half}>Rematch</Button>
      <Button secondary icon={Plus} onPress={newGame} style={styles.half}>New game</Button>
    </View>
  </Sheet>;
}

const styles = StyleSheet.create({
  opponent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: 'DM_700', fontSize: 18, lineHeight: 24, color: C.ink },
  note: { fontSize: 12, lineHeight: 18, color: C.muted },
  rating: { backgroundColor: C.green, borderRadius: 18, padding: 18, gap: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  ratingValue: { fontFamily: 'Serif', fontSize: 48, lineHeight: 58, color: '#FFFFFF' },
  change: { fontFamily: 'DM_700', fontSize: 15, color: C.green, backgroundColor: C.lime, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  loss: { color: '#7D3929', backgroundColor: '#F6DDD3' },
  ratingNote: { fontFamily: 'DM_500', fontSize: 12, lineHeight: 18, color: '#E2EBDD' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, paddingHorizontal: 8 },
});
