import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, History as HistoryIcon, TrendingUp } from 'lucide-react-native';
import { Body, Button, C, Card, Heading, IconButton, Label, s } from '../components/ui';
import { LEVELS, VARIANTS, computerLevel, sideName, type VariantId } from '../game/variants';
import { gameScore, levelRecord } from '../game/records';
import { useGame } from '../state/GameContext';

export default function History() {
  const { config, archive, ratings, stats, loadArchivedGame, storageError } = useGame();
  const params = useLocalSearchParams<{ variant?: string; mode?: string }>();
  const [variant, setVariant] = useState<VariantId>(Object.values(VARIANTS).find(item => item.id === params.variant)?.id ?? config.variant);
  const [elo, setElo] = useState<number | null>(null);
  const [mode, setMode] = useState<'all' | 'computer' | 'friend'>(params.mode === 'friend' ? 'friend' : 'computer');
  const games = useMemo(() => archive.filter(entry => entry.variant === variant && (mode === 'all' || entry.mode === mode) && (elo === null || (entry.mode === 'computer' && entry.elo === elo))), [archive, variant, elo, mode]);
  const rating = ratings[variant];
  return <FlatList data={games} keyExtractor={game => game.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListHeaderComponent={<View style={{ gap: 16, marginBottom: 16, backgroundColor: C.bg, padding: 12, borderRadius: 16 }}>
    <View style={s.row}><IconButton icon={ArrowLeft} label="Back to Learn" onPress={() => router.navigate('/learn')} /><Heading style={{ fontSize: 22 }}>Ratings & game history</Heading></View>
    {storageError && <Body style={{ color: '#AE4E3D' }}>Device storage is unavailable. Your latest results may not be saved.</Body>}
    <View style={styles.filters}>{Object.values(VARIANTS).map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={`History variant ${item.name}`} accessibilityState={{ checked: variant === item.id }} aria-checked={variant === item.id} onPress={() => { setVariant(item.id); setElo(null); }} style={[styles.filter, variant === item.id && styles.selected]}><Text style={styles.filterText}>{item.name}</Text></Pressable>)}</View>
    <View style={styles.rating}>
      <View style={s.between}><Label style={{ color: C.lime }}>YOUR {VARIANTS[variant].name.toUpperCase()} RATING</Label><TrendingUp size={22} color={C.lime} /></View>
      <Text style={styles.ratingValue}>{rating.value}</Text><Text style={{ color: '#E2EBDD', fontFamily: 'DM_500', fontSize: 12 }}>{rating.games < 10 ? `Provisional · ${rating.games}/10 games` : `${rating.games} rated games`} · Peak {rating.peak}</Text>
    </View>
    <Body style={styles.note}>Local computer ratings start at 1200 for each variant. Every win, draw, or loss updates Elo using K=32 and the opponent’s estimated rating. Two-player games do not affect ratings.</Body>
    <View style={styles.summary}>{[{ label: 'CPU games', value: stats.played }, { label: 'Wins', value: stats.wins }, { label: 'Draws', value: stats.draws }, { label: 'Losses', value: stats.losses }].map(item => <View key={item.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}><Text style={styles.total}>{item.value}</Text><Text style={styles.note}>{item.label}</Text></View>)}</View>
    <View style={s.between}><Heading style={{ fontSize: 19 }}>Your opponents</Heading><Label>W / D / L</Label></View>
    <View style={styles.grid}>{LEVELS.map(level => {
      const record = levelRecord(archive, variant, level.elo);
      return <Pressable key={level.elo} accessibilityRole="button" accessibilityLabel={`History against ${level.name}, ${level.elo} Elo`} accessibilityState={{ selected: elo === level.elo }} onPress={() => { setElo(elo === level.elo ? null : level.elo); setMode('computer'); }} style={[styles.opponent, elo === level.elo && styles.selected]}>
        <View style={s.between}><Text style={styles.name}>{level.name}</Text><Label>~{level.elo}</Label></View><Body style={styles.note}>{level.title}</Body><Text style={{ fontFamily: 'DM_700', color: C.green, marginTop: 9 }}>{record.wins} / {record.draws} / {record.losses}</Text><Text style={styles.note}>{record.played} games</Text>
      </Pressable>;
    })}</View>
    <View style={s.between}><Heading style={{ fontSize: 19 }}>{elo === null ? 'Completed games' : `Against ${computerLevel(elo).name}`}</Heading><Label>{games.length} results</Label></View>
    <View style={styles.filters}>{([{ id: 'computer', name: 'Computer' }, { id: 'friend', name: '2 players' }, { id: 'all', name: 'All' }] as const).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: mode === item.id }} onPress={() => { setMode(item.id); setElo(null); }} style={[styles.filter, mode === item.id && styles.selected]}><Text style={styles.filterText}>{item.name}</Text></Pressable>)}{elo !== null && <Button secondary onPress={() => setElo(null)}>All levels</Button>}</View>
  </View>} renderItem={({ item: entry }) => {
    const score = gameScore(entry);
    const label = entry.mode === 'friend' ? entry.winner ? `${sideName(entry.winner)} won` : 'Draw' : score === 1 ? 'Victory' : score === 0.5 ? 'Draw' : 'Defeat';
    return <Card style={{ gap: 8 }}>
      <View style={s.between}><Text style={[styles.name, { color: score === 0 && entry.mode === 'computer' ? '#A34F3D' : C.green }]}>{label}</Text><Text style={styles.note}>{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
      <Body style={{ fontFamily: 'DM_600', fontSize: 13 }}>{entry.mode === 'computer' ? `vs ${entry.opponentName ?? computerLevel(entry.elo).name} · ~${entry.elo} Elo` : 'Two players on this device'}</Body>
      {entry.ratingBefore !== undefined && entry.ratingAfter !== undefined && <View style={styles.change}><Text style={{ fontFamily: 'DM_700', color: C.green }}>Rating {entry.ratingBefore} → {entry.ratingAfter}</Text><Text style={{ fontFamily: 'DM_700', color: (entry.ratingChange ?? 0) < 0 ? '#A34F3D' : C.green }}>{(entry.ratingChange ?? 0) >= 0 ? '+' : ''}{entry.ratingChange}</Text></View>}
      <Body style={styles.note}>{entry.reason} · {entry.moves} half-moves · {entry.timeControl ? `${entry.timeControl} min` : 'Untimed'}</Body>
      <View style={s.between}><Text style={styles.note}>You played {sideName(entry.userSide)}</Text><Button secondary disabled={!entry.pdn} onPress={() => { loadArchivedGame(entry); router.navigate('/analysis'); }} style={{ minHeight: 44 }}>Review game</Button></View>
    </Card>;
  }} ListEmptyComponent={<Card style={{ alignItems: 'center', padding: 28, gap: 12 }}><HistoryIcon size={28} color={C.green} /><Heading style={{ fontSize: 18 }}>Your next game starts the story</Heading><Body style={[styles.note, { textAlign: 'center' }]}>Completed games will appear here, with the opponent, result, rating change, and a board you can review.</Body><Button onPress={() => router.navigate('/')}>Play a game</Button></Card>} ListFooterComponent={<Body style={[styles.note, { marginTop: 20, padding: 12, backgroundColor: C.paper, borderRadius: 12 }]}>Results and full move lists are saved on this device. Computer strengths are estimates; this rating is for your progress in OpenCheckers.</Body>} />;
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 740, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, filter: { minHeight: 44, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper }, selected: { backgroundColor: C.pale, borderColor: '#91AC84' }, filterText: { fontFamily: 'DM_600', fontSize: 12, color: C.green },
  rating: { backgroundColor: C.green, padding: 22, borderRadius: 22, gap: 8 }, ratingValue: { fontFamily: 'Serif', fontSize: 58, color: '#FFF', lineHeight: 66 },
  note: { fontSize: 12, lineHeight: 18, color: C.muted }, summary: { flexDirection: 'row', borderRadius: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }, total: { fontFamily: 'DM_700', fontSize: 20, color: C.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, opponent: { width: '48%', flexGrow: 1, padding: 13, backgroundColor: C.paper, borderRadius: 14, borderWidth: 1, borderColor: C.line }, name: { fontFamily: 'DM_700', fontSize: 15, color: C.ink }, change: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 10, backgroundColor: C.soft },
});
