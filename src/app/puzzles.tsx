import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Puzzle as PuzzleIcon, Sparkles } from 'lucide-react-native';
import { Body, C, Heading, IconButton, Label, s } from '../components/ui';
import { PUZZLES, PUZZLE_LEVELS, puzzleLine } from '../game/puzzles';
import { VARIANTS, type VariantId } from '../game/variants';
import { useGame } from '../state/GameContext';

export default function Puzzles() {
  const params = useLocalSearchParams<{ level?: string; variant?: string }>();
  const [level, setLevel] = useState(Number(params.level) >= 1 && Number(params.level) <= 5 ? Number(params.level) : 1);
  const [variant, setVariant] = useState<VariantId | 'all'>(params.variant && params.variant in VARIANTS ? params.variant as VariantId : 'all');
  const { solvedPuzzles } = useGame();
  const eligible = PUZZLES.filter(puzzle => variant === 'all' || puzzle.variant === variant);
  const puzzles = eligible.filter(puzzle => puzzle.level === level);
  const solved = PUZZLES.filter(puzzle => solvedPuzzles.includes(puzzle.id)).length;
  return <FlatList data={puzzles} keyExtractor={puzzle => puzzle.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListHeaderComponent={<View style={{ gap: 18, padding: 12, marginBottom: 16, backgroundColor: C.bg, borderRadius: 16 }}>
    <View style={s.row}><IconButton icon={ArrowLeft} label="Back to Learn" onPress={() => router.navigate('/learn')} /><Label>THE PRACTICE ROOM</Label></View>
    <View style={styles.hero}>
      <View style={s.between}><PuzzleIcon color={C.lime} size={30} /><Text style={styles.heroCount}>{solved} / {PUZZLES.length} solved</Text></View>
      <Heading style={styles.heroTitle}>Train your eye.</Heading>
      <Body style={{ color: '#DDE8D8', fontSize: 13 }}>Find the idea. Play it on the board. Hints are here when you need them.</Body>
      <View style={styles.track}><View style={[styles.fill, { width: `${100 * solved / PUZZLES.length}%` }]} /></View>
    </View>
    <View style={{ gap: 10 }}><Label>RULES VARIANT</Label><View style={styles.filters}>{(['all', ...Object.keys(VARIANTS)] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Puzzle variant ${id === 'all' ? 'All' : VARIANTS[id as VariantId].name}`} accessibilityState={{ selected: variant === id }} onPress={() => setVariant(id as VariantId | 'all')} style={[styles.filter, variant === id && styles.filterActive]}><Text style={[styles.filterText, variant === id && { color: '#FFF' }]}>{id === 'all' ? 'All' : id === 'international' ? 'Intl.' : VARIANTS[id as VariantId].name}</Text></Pressable>)}</View></View>
    <View style={{ gap: 10 }}><Label>CHOOSE YOUR LEVEL</Label><View style={{ flexDirection: 'row', gap: 7 }}>{PUZZLE_LEVELS.map(item => {
      const count = eligible.filter(puzzle => puzzle.level === item.level);
      const completed = count.filter(puzzle => solvedPuzzles.includes(puzzle.id)).length;
      return <Pressable key={item.level} accessibilityRole="radio" accessibilityLabel={`Level ${item.level}: ${item.name}`} accessibilityState={{ checked: level === item.level }} onPress={() => setLevel(item.level)} style={[styles.level, level === item.level && styles.activeLevel]}>
        <Text style={{ fontFamily: 'DM_700', color: C.green, fontSize: 18 }}>{item.level}</Text><Text style={styles.count}>{completed}/{count.length}</Text>
      </Pressable>;
    })}</View><View><Text style={styles.name}>{PUZZLE_LEVELS[level - 1].name}</Text><Body style={styles.note}>{PUZZLE_LEVELS[level - 1].description}</Body></View></View>
    <View style={s.between}><Heading style={{ fontSize: 20 }}>Level {level} puzzles</Heading><Label>{puzzles.length} positions</Label></View>
  </View>} renderItem={({ item: puzzle, index }) => {
    const complete = solvedPuzzles.includes(puzzle.id);
    const moves = Math.ceil((puzzleLine(puzzle).length - 1) / 2);
    return <Pressable accessibilityRole="button" accessibilityLabel={`Open puzzle: ${puzzle.title}, ${VARIANTS[puzzle.variant].name}`} onPress={() => router.push({ pathname: '/puzzle', params: { id: puzzle.id } })} style={({ pressed }) => [styles.puzzle, pressed && { opacity: 0.75 }]}>
      <View style={styles.puzzleIcon}>{complete ? <CheckCircle2 size={24} color={C.green} /> : <Text style={{ fontFamily: 'DM_700', color: C.green }}>{String(index + 1).padStart(2, '0')}</Text>}</View>
      <View style={{ flex: 1, gap: 3 }}><Text style={styles.name}>{puzzle.title}</Text><Body style={styles.note}>{VARIANTS[puzzle.variant].name} · {moves} {moves === 1 ? 'move' : 'moves'} · {puzzle.theme}</Body>{complete && <Text style={{ fontFamily: 'DM_600', fontSize: 11, color: C.green }}>Solved</Text>}</View><ArrowRight size={18} color={C.green} />
    </Pressable>;
  }} ListEmptyComponent={<View style={styles.puzzle}><Sparkles size={22} color={C.green} /><Body style={{ flex: 1 }}>No puzzles at this level for this variant yet. Choose another level or All variants.</Body></View>} ListFooterComponent={<Body style={[styles.note, { marginTop: 22, padding: 12, backgroundColor: C.paper, borderRadius: 12 }]}>33 puzzles from the MIT-licensed Shadow Checkers database, plus 4 original lessons. All positions and solution branches are verified and available offline. Source credit appears on each puzzle.</Body>} />;
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 740, alignSelf: 'center' },
  hero: { backgroundColor: C.green, borderRadius: 22, padding: 20, gap: 10 },
  heroTitle: { color: '#FFF', fontFamily: 'Serif', fontSize: 31, lineHeight: 37 },
  heroCount: { color: C.lime, fontFamily: 'DM_600', fontSize: 12 },
  track: { height: 5, borderRadius: 5, backgroundColor: '#50725D', overflow: 'hidden' }, fill: { height: 5, backgroundColor: C.lime, borderRadius: 5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  filterActive: { backgroundColor: C.green, borderColor: C.green }, filterText: { fontFamily: 'DM_600', fontSize: 12, color: C.green },
  level: { flex: 1, alignItems: 'center', gap: 4, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  activeLevel: { backgroundColor: C.pale, borderColor: '#91AC84' }, levelNumber: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft },
  name: { fontFamily: 'DM_700', fontSize: 14, color: C.ink }, note: { fontSize: 12, lineHeight: 18, color: C.muted }, count: { fontFamily: 'DM_600', fontSize: 12, color: C.muted },
  puzzle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, minHeight: 82 },
  puzzleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
});
