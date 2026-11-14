import React from 'react';
import { Pressable, View, Text, Switch, ScrollView } from 'react-native';
import { ChevronRight, Cpu, Crown } from 'lucide-react-native';
import { Body, C, Card, Heading, Label, s } from './ui';
import { VARIANTS, sideName } from '../game/variants';
import { notation, type Move, type Position } from '../game/engine';
import { type Tree } from '../state/GameContext';
import { displayLine } from '../game/analysis';
import { type SearchResult, evaluate, positionalBreakdown } from '../game/ai';
import Svg, { Circle, Line, Path } from 'react-native-svg';
export { displayLine } from '../game/analysis';

export function MiniBoard({ size = 8, active = false }: { size?: number; active?: boolean }) {
  return <View style={{ width: 28, height: 28, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: active ? '#9CAE8D' : '#CFD5C8' }}>{Array.from({ length: 36 }, (_, i) => <View key={i} style={{ width: '16.6667%', height: '16.6667%', backgroundColor: (Math.floor(i / 6) + i % 6) % 2 ? (active ? '#75916D' : '#AAB5A3') : '#EDF0E6' }} />)}{size === 10 && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, backgroundColor: C.green, borderTopLeftRadius: 3 }} />}</View>;
}
export function MoveHistory({ tree, navigate, analysis = false }: { tree: Tree; navigate: (id: number) => void; analysis?: boolean }) {
  const line = displayLine(tree);
  const moves = line.slice(1);
  const size = VARIANTS[line[0].position.variant].size;
  const first = line[0].position.turn;
  const rows = Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => moves.slice(i * 2, i * 2 + 2));
  return <Card style={{ paddingBottom: 17 }}><View style={s.between}><Label>Moves</Label><Body style={{ fontSize: 12, color: C.muted }}>{moves.length} half-moves</Body></View>
    {moves.length ? <><View style={[s.row, { marginTop: 13, marginBottom: 7 }]}><View style={{ width: 30 }} /><Label style={{ flex: 1, fontSize: 12 }}>{sideName(first)}</Label><Label style={{ flex: 1, fontSize: 12 }}>{sideName(first === 'white' ? 'black' : 'white')}</Label></View><ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>{rows.map((row, i) => <View key={i} style={[s.row, { marginVertical: 2 }]}><Body style={{ width: 28, color: '#A2A89C', fontSize: 12 }}>{i + 1}.</Body>{[0, 1].map(j => {
      const item = row[j];
      if (!item) return <View key={j} style={{ flex: 1 }} />;
      const active = tree.current === item.id;
      const parentPos = item.parent !== null ? tree.nodes[item.parent]?.position : null;
      const promoted = Boolean(item.move?.king && parentPos && !parentPos.board[item.move.from]?.king);
      return <Pressable key={j} accessibilityRole="button" accessibilityLabel={`Go to move ${i * 2 + j + 1}, ${notation(item.move!, size)}`} onPress={() => navigate(item.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: active ? C.pale : 'transparent', borderWidth: active ? 1 : 0, borderColor: '#B8CAAC', borderRadius: 6, minHeight: 44, paddingVertical: 8, paddingHorizontal: 8 }}>
        <Text style={{ flexShrink: 1, fontFamily: active ? 'DM_600' : 'DM_400', fontSize: 12, color: active ? C.green : C.ink }}>{notation(item.move!, size)}</Text>
        {promoted && <Crown size={12} color={C.green} />}
      </Pressable>;
    })}</View>)}</ScrollView></> : <View style={{ paddingVertical: 19, gap: 7, alignItems: 'center' }}><View style={[s.row, { gap: 15 }]}><Body style={{ color: '#C4C9BB' }}>1.</Body><Body style={{ color: '#CCD0C4' }}>— —</Body><Body style={{ color: '#CCD0C4' }}>— —</Body></View><Body style={{ fontSize: 12, color: C.muted }}>No moves yet.</Body></View>}
    {analysis && tree.nodes[tree.current].children.length > 1 && <View style={{ marginTop: 13 }}><Label style={{ fontSize: 12 }}>Variations from here</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{tree.nodes[tree.current].children.map((id, i) => <Pressable key={id} onPress={() => navigate(id)} accessibilityRole="button" style={{ maxWidth: '100%', minHeight: 44, justifyContent: 'center', padding: 12, backgroundColor: C.pale, borderRadius: 5 }}><Body style={{ fontSize: 12 }}>{i + 1}. {notation(tree.nodes[id].move!, size)}</Body></Pressable>)}</View></View>}
  </Card>;
}

export const formatScore = (value: number) => Math.abs(value) > 9000 ? (value > 0 ? 'Ivory wins' : 'Coral wins') : (value >= 0 ? '+' : '−') + (Math.abs(value) / 100).toFixed(2);
export function EnginePanel({ position, result, busy, enabled, toggle, playLine }: { position: Position; result: SearchResult | null; busy: boolean; enabled: boolean; toggle: () => void; playLine: (move: Move) => void }) {
  const score = result?.score ?? evaluate(position);
  const widthPercent = 50 + Math.tanh(score / 350) * 45;
  const breakdown = positionalBreakdown(position);
  const bestScore = result?.lines[0]?.score ?? score;
  const sideSign = position.turn === 'white' ? 1 : -1;
  const kns = result?.nps ? `${(result.nps / 1000).toFixed(1)} kN/s` : null;
  const verdict = Math.abs(score) > 9000 ? 'Forced win detected' : Math.abs(score) < 25 ? 'Balanced (draw zone)' : Math.abs(score) < 75 ? `${score > 0 ? 'Ivory' : 'Coral'} positional edge` : `${score > 0 ? 'Ivory' : 'Coral'} clear advantage`;
  return <Card><View style={s.between}><View style={[s.row, { gap: 8 }]}><Cpu size={16} color={C.green} /><Label>Engine analysis</Label></View><Switch accessibilityLabel="Enable engine analysis" value={enabled} onValueChange={toggle} trackColor={{ false: '#DEE3D6', true: '#6D8A5E' }} thumbColor="#fff" /></View>
    <View style={[s.between, { marginTop: 16 }]}><Heading style={{ fontSize: 31 }}>{formatScore(score)}</Heading><View style={{ alignItems: 'flex-end' }}><Body style={{ fontSize: 12, color: C.muted }}>{busy ? 'Thinking…' : enabled ? `Depth ${result?.depth ?? 0}` : 'Engine paused'}</Body><Body style={{ fontSize: 12, color: C.muted }}>{result ? `${result.nodes.toLocaleString()} positions${kns ? ` · ${kns}` : ''}` : 'Static evaluation'}</Body></View></View>
    <View style={{ height: 8, borderRadius: 5, backgroundColor: C.coral, overflow: 'hidden', marginTop: 12 }}><View style={{ width: `${widthPercent}%`, height: '100%', backgroundColor: '#DFDFC9' }} /></View><Body style={{ fontSize: 12, color: C.muted, marginTop: 7 }}>{verdict} · Ivory-positive centimen (+1.00 = 1 man)</Body>
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
      {[
        { label: 'Tempo (pips)', val: `${breakdown.white.tempo} : ${breakdown.black.tempo}` },
        { label: 'Center', val: `${breakdown.white.center} : ${breakdown.black.center}` },
        { label: 'Back rank', val: `${breakdown.white.backRank} : ${breakdown.black.backRank}` },
      ].map(item => <View key={item.label} style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DM_700', fontSize: 12, color: C.ink }}>{item.val}</Text>
        <Body style={{ fontSize: 10, color: C.muted, lineHeight: 14 }}>{item.label}</Body>
      </View>)}
    </View>
    <View style={s.divider} /><Label style={{ fontSize: 12 }}>Multi-PV candidate lines</Label>
    {enabled && result?.lines.length ? result.lines.slice(0, 3).map((line, i) => {
      const loss = Math.max(0, (bestScore - line.score) * sideSign);
      const tag = i === 0 ? 'Best' : loss <= 15 ? 'Book / Equal' : loss <= 45 ? `−${(loss / 100).toFixed(2)}` : `−${(loss / 100).toFixed(2)} ?`;
      return <Pressable accessibilityRole="button" accessibilityLabel={`Play candidate ${i + 1}: ${notation(line.move, VARIANTS[position.variant].size)}`} key={line.move.id} onPress={() => playLine(line.move)} style={{ marginTop: 12, gap: 5, minHeight: 66, paddingVertical: 10, borderBottomWidth: i < 2 ? 1 : 0, borderColor: C.line }}>
        <View style={s.between}>
          <View style={[s.row, { gap: 8, flex: 1, flexWrap: 'wrap' }]}>
            <Text style={{ fontFamily: 'DM_600', fontSize: 11, color: i === 0 ? C.green : '#8D9885', backgroundColor: i === 0 ? C.pale : C.soft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>PV {i + 1}</Text>
            <Text style={{ maxWidth: '100%', flexShrink: 1, fontFamily: 'DM_700', fontSize: 13, color: C.green }}>{notation(line.move, VARIANTS[position.variant].size)}</Text>
            <Text style={{ fontFamily: 'DM_500', fontSize: 11, color: loss > 45 ? '#AE4E3D' : C.muted }}>{tag}</Text>
          </View>
          <Body style={{ fontSize: 12, fontFamily: 'DM_600' }}>{formatScore(line.score)}</Body>
        </View>
        <Body style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>{line.pv.slice(1).map(m => notation(m, VARIANTS[position.variant].size)).join('   ') || 'Tap to play this line on the board'}  <ChevronRight size={10} color={C.muted} /></Body>
      </Pressable>;
    }) : <Body style={{ color: C.muted, fontSize: 12, marginTop: 15 }}>{enabled ? 'Finding the possibilities in this position…' : 'Turn on the engine to explore candidate moves.'}</Body>}
  </Card>;
}
export function EvaluationGraph({ tree, navigate }: { tree: Tree; navigate: (id: number) => void }) {
  const nodes = displayLine(tree);
  const currentIndex = Math.max(0, nodes.findIndex(n => n.id === tree.current));
  const points = nodes.map((node, i) => [10 + (i / Math.max(1, nodes.length - 1)) * 480, 42 - Math.tanh(evaluate(node.position) / 300) * 32] as const);
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const activePoint = points[currentIndex] ?? points[0];
  return <Card style={{ marginTop: 17, padding: 17 }}><View style={s.between}><Label style={{ fontSize: 12 }}>Position overview</Label><Body style={{ fontSize: 12, color: C.muted }}>Material & position</Body></View><View style={{ height: 88, marginTop: 8 }}><Svg width="100%" height="88" viewBox="0 0 500 88" preserveAspectRatio="none"><Line x1="0" y1="42" x2="500" y2="42" stroke="#DFE3D8" strokeDasharray="3 4" /><Path d={`${d} L${points[points.length - 1][0]},84 L10,84 Z`} fill="#EAF0E1" /><Path d={d} stroke="#7C9567" fill="none" strokeWidth="2.2" />{activePoint && <><Line x1={activePoint[0]} y1="4" x2={activePoint[0]} y2="84" stroke="#285740" strokeWidth="1.5" strokeDasharray="2 2" /><Circle cx={activePoint[0]} cy={activePoint[1]} r="4" fill="#285740" /></>}</Svg><View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' }}>{nodes.map(node => <Pressable key={node.id} accessibilityRole="button" accessibilityLabel={`Review position after ${node.position.ply} half-moves`} onPress={() => navigate(node.id)} style={{ flex: 1 }} />)}</View></View></Card>;
}
