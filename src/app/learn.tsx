import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Award, ChevronDown, ChevronUp, Crown, GraduationCap, History, MoveUpRight, Puzzle, Swords, Trophy } from 'lucide-react-native';
import { Body, Button, C, Card, Heading, Label, s } from '../components/ui';
import { LEVELS, VARIANTS, type VariantId } from '../game/variants';
import { PUZZLES } from '../game/puzzles';
import { useGame } from '../state/GameContext';
import { MiniBoard } from '../components/GamePanels';
import { Page } from '../components/mobile/Page';

export default function Learn() {
  const { config, stats, ratings, solvedPuzzles, openTutorial } = useGame();
  const [expanded, setExpanded] = useState<VariantId | null>(config.variant);
  const solved = PUZZLES.filter(puzzle => solvedPuzzles.includes(puzzle.id)).length;
  return <Page>
    <Pressable accessibilityRole="button" accessibilityLabel="Open tactical puzzles" onPress={() => router.push('/puzzles')} style={({ pressed }) => ({ backgroundColor: C.green, borderRadius: 22, padding: 23, gap: 14, opacity: pressed ? 0.85 : 1 })}>
      <View style={s.between}><View style={[s.row, { gap: 8 }]}><Puzzle size={24} color={C.lime} /><Text style={{ fontFamily: 'DM_600', fontSize: 12, color: C.lime }}>THE PRACTICE ROOM</Text></View><ArrowRight size={22} color={C.lime} /></View>
      <Heading style={{ fontFamily: 'Serif', color: '#FFF', fontSize: 32, lineHeight: 38 }}>Tactical puzzles</Heading>
      <Body style={{ color: '#E2EBDD', fontSize: 13 }}>See the idea. Play the moves. Build your intuition on a real board, one combination at a time.</Body>
      <View style={s.between}><Text style={{ color: '#FFF', fontFamily: 'DM_700', fontSize: 13 }}>Choose a level & play →</Text><Text style={{ fontFamily: 'DM_500', fontSize: 12, color: C.lime }}>{solved} / {PUZZLES.length} solved</Text></View>
    </Pressable>
    <Card>
      <View style={[s.row, { gap: 8 }]}><Award size={19} color={C.green} /><Heading style={{ fontSize: 19 }}>Your club record</Heading></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>{[
        { label: VARIANTS[config.variant].name + ' rating', value: ratings[config.variant].value },
        { label: 'CPU games', value: stats.played }, { label: 'Wins', value: stats.wins }, { label: 'Losses', value: stats.losses },
      ].map(item => <View key={item.label} style={{ flex: 1, minWidth: 120, padding: 13, borderRadius: 12, backgroundColor: C.soft }}><Text style={{ fontFamily: 'DM_700', fontSize: 22, color: C.green }}>{item.value}</Text><Body style={{ fontSize: 11, color: C.muted }}>{item.label}</Body></View>)}</View>
      <Body style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Ratings, results, and your record against each club opponent are saved on this device.</Body>
      <Button secondary icon={History} onPress={() => router.push('/history')} style={{ marginTop: 14 }}>Ratings & game history</Button>
    </Card>
    <Card>
      <View style={[s.row, { gap: 8 }]}><GraduationCap size={19} color={C.green} /><Heading style={{ fontSize: 19 }}>App tutorial & guide</Heading></View>
      <Body style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>Get comfortable with board coordinates, move notation, PDN sharing, and the engine analyser.</Body>
      <Button icon={GraduationCap} onPress={openTutorial} style={{ marginTop: 14 }}>Open interactive tutorial</Button>
    </Card>
    <Card><Heading style={{ fontSize: 19 }}>How to play</Heading>{[
      { icon: MoveUpRight, title: 'Move', body: 'Tap your piece, then a highlighted dark square. Men move one square diagonally forward.' },
      { icon: Swords, title: 'Capture', body: 'Captures are compulsory. Jump over an opponent into an empty square, then complete the remaining jumps.' },
      { icon: Crown, title: 'Become a king', body: 'Reach the far row to crown your piece. Kings can move backward; some variants have flying kings.' },
      { icon: Trophy, title: 'Win', body: 'Capture every opponent piece or block every legal move. Threefold repetition is a draw.' },
    ].map(({ icon: Icon, title, body }) => <View key={title} style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}><View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={C.green} /></View><View style={{ flex: 1 }}><Body style={{ fontFamily: 'DM_700' }}>{title}</Body><Body style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{body}</Body></View></View>)}</Card>
    <Heading style={{ fontSize: 19 }}>Variant rules</Heading>
    <View style={{ gap: 8 }}>{Object.values(VARIANTS).map(variant => <Card key={variant.id} style={{ padding: 0, overflow: 'hidden' }}><Pressable accessibilityRole="button" accessibilityLabel={variant.name + ' rules'} accessibilityState={{ expanded: expanded === variant.id }} onPress={() => setExpanded(expanded === variant.id ? null : variant.id)} style={[s.between, { minHeight: 68, padding: 16, gap: 12 }]}><MiniBoard size={variant.size} active /><View style={{ flex: 1 }}><Text style={{ fontFamily: 'DM_700', fontSize: 15, color: C.ink }}>{variant.name}</Text><Body style={{ color: C.muted, fontSize: 12 }}>{variant.size} × {variant.size} · {variant.rows * variant.size / 2} pieces each</Body></View>{expanded === variant.id ? <ChevronUp size={20} color={C.green} /> : <ChevronDown size={20} color={C.muted} />}</Pressable>{expanded === variant.id && <Body style={{ color: C.muted, fontSize: 13, paddingHorizontal: 16, paddingBottom: 16 }}>{variant.description}</Body>}</Card>)}</View>
    <Card><Heading style={{ fontSize: 19 }}>Meet the club</Heading><Body style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>Six opponents, from a first game to a serious challenge. Their Elo labels estimate difficulty.</Body>{LEVELS.map(level => <View key={level.elo} style={{ marginTop: 16, gap: 3 }}><View style={s.between}><Body style={{ fontFamily: 'DM_700' }}>{level.name} · {level.title}</Body><Label>~{level.elo}</Label></View><Body style={{ fontSize: 12, color: C.muted }}>{level.personality}</Body></View>)}</Card>
  </Page>;
}

