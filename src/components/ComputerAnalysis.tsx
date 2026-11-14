import React, { useId, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, RotateCcw, Square } from 'lucide-react-native';
import Svg, { Circle, ClipPath, Defs, Line, Path, Rect } from 'react-native-svg';
import { notation } from '../game/engine';
import { reviewedMove } from '../game/analysis';
import { VARIANTS } from '../game/variants';
import type { useComputerAnalysis } from '../hooks/useComputerAnalysis';
import { Body, C, IconButton } from './ui';
import { formatScore } from './GamePanels';

export function ComputerAnalysis({ analysis, navigate, width }: {
  analysis: ReturnType<typeof useComputerAnalysis>;
  navigate: (id: number) => void;
  width: number;
}) {
  const { line, points, completed, hasMoves, complete, running, error, start, stop, hasRequest, offMainLine } = analysis;
  const [chartWidth, setChartWidth] = useState(0);
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const selected = analysis.selectedIndex;
  const point = points[selected];
  const review = reviewedMove(line, selected, points);
  const size = VARIANTS[line[0].position.variant].size;
  const moveLabel = selected === 0 ? 'Starting position' : `${Math.ceil(selected / 2)}${selected % 2 ? '.' : '…'} ${notation(line[selected].move!, size)}`;
  const coordinates = points.map((value, index) => value ? { x: 12 + index / Math.max(1, line.length - 1) * 576, y: 72 - Math.tanh(value.score / 350) * 60 } : null);
  // Start a new subpath across any unfinished positions. Pending evaluations
  // never appear as an invented score or a static material estimate.
  const sections: { x: number; y: number }[][] = [[]];
  for (const value of coordinates) {
    if (value) sections[sections.length - 1].push(value);
    else sections.push([]);
  }
  const segments = sections.filter(section => section.length);
  const paths = segments.map(section => `M${section[0].x},72 ${section.map(({ x, y }) => `L${x},${y}`).join(' ')} L${section[section.length - 1].x},72 Z`);
  const curve = segments.map(section => section.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ')).join(' ');
  const active = coordinates[selected];
  const choose = (index: number) => navigate(line[Math.max(0, Math.min(line.length - 1, index))].id);
  const showGraph = hasRequest;

  return <View testID="computer-analysis" style={[styles.card, { width }]}>
    <View style={styles.header}>
      <View style={styles.titleRow}><ChartNoAxesCombined size={20} color={C.green} /><Text style={styles.title}>Computer analysis</Text></View>
      {complete && width >= 340 && <View style={styles.complete}><Check size={13} color={C.green} /><Text style={styles.completeLabel}>Complete</Text></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={running ? 'Stop computer analysis' : complete ? 'Reanalyse game' : hasRequest ? 'Resume computer analysis' : 'Run computer analysis'} disabled={!hasMoves} onPress={running ? stop : start} style={({ pressed }) => [styles.run, running && styles.stop, !hasMoves && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}>
        {running ? <Square size={12} color={C.green} /> : complete ? <RotateCcw size={13} color="#fff" /> : null}
        <Text style={[styles.runLabel, running && { color: C.green }]}>{running ? 'Stop' : complete ? 'Run again' : hasRequest ? 'Resume' : 'Analyse game'}</Text>
      </Pressable>
    </View>
    {!showGraph && <Body style={styles.note}>{hasMoves ? 'Analyse the full game. Your last five requests are saved.' : 'Full-game analysis is for completed games and imported PDNs. Position evaluation stays live above.'}</Body>}
    {showGraph && offMainLine && <Body style={styles.note}>Variation selected · The original game analysis is preserved.</Body>}
    {showGraph && <>
      <View style={styles.legend}><Text style={styles.legendText}>Ivory advantage</Text><Text style={styles.legendText}>+1.00 = one man</Text></View>
      <Pressable testID="computer-analysis-graph" accessibilityRole="adjustable" accessibilityLabel="Computer analysis evaluation graph" accessibilityHint="Tap the graph to review a position. Swipe up or down to change the move." accessibilityValue={{ min: 0, max: line.length - 1, now: selected, text: `${moveLabel}, ${point ? formatScore(point.score) : 'not analysed yet'}` }} accessibilityActions={[{ name: 'increment', label: 'Next move' }, { name: 'decrement', label: 'Previous move' }]} onAccessibilityAction={event => choose(selected + (event.nativeEvent.actionName === 'increment' ? 1 : -1))} onLayout={event => setChartWidth(event.nativeEvent.layout.width)} onPress={event => {
        // Web delivers a MouseEvent; native supplies a gesture location.
        const localX = (event.nativeEvent as typeof event.nativeEvent & { offsetX?: number }).offsetX ?? event.nativeEvent.locationX;
        if (chartWidth && Number.isFinite(localX)) choose(Math.round((localX / chartWidth * 600 - 12) / 576 * (line.length - 1)));
      }} style={styles.chart}>
        <View pointerEvents="none"><Svg width="100%" height={144} viewBox="0 0 600 144" preserveAspectRatio="none">
          <Defs><ClipPath id={`${clipId}top`}><Rect width={600} height={72} /></ClipPath><ClipPath id={`${clipId}bottom`}><Rect y={72} width={600} height={72} /></ClipPath></Defs>
          <Rect width={600} height={144} fill="#F5F7F1" /><Rect y={72} width={600} height={72} fill="#ECEDE7" />
          {[36, 108].map(y => <Line key={y} x1={0} y1={y} x2={600} y2={y} stroke="#DDE2D7" strokeDasharray="3 5" />)}
          {paths.map((d, index) => <React.Fragment key={index}><Path d={d} fill="#C9DCBB" clipPath={`url(#${clipId}top)`} /><Path d={d} fill="#DBC2B7" clipPath={`url(#${clipId}bottom)`} /></React.Fragment>)}
          <Line x1={0} y1={72} x2={600} y2={72} stroke="#AAB7A4" strokeDasharray="4 4" />
          <Path d={curve} stroke={C.green} strokeWidth={2} fill="none" />
          {coordinates.map((value, index) => {
            const quality = reviewedMove(line, index, points)?.quality;
            return value && quality ? <Circle key={index} cx={value.x} cy={value.y} r={quality === 'Blunder' ? 4.5 : 3} fill={quality === 'Blunder' ? '#B64A38' : quality === 'Mistake' ? '#C97C31' : '#A39B47'} /> : null;
          })}
          <Line x1={12 + selected / Math.max(1, line.length - 1) * 576} y1={0} x2={12 + selected / Math.max(1, line.length - 1) * 576} y2={144} stroke={C.green} strokeWidth={1.5} strokeDasharray="3 3" />
          {active && <Circle cx={active.x} cy={active.y} r={4.5} fill={C.green} stroke="#fff" strokeWidth={1.5} />}
        </Svg></View>
      </Pressable>
      <View style={styles.axis}><Text style={styles.legendText}>Start</Text><Text style={styles.legendText}>Coral advantage</Text><Text style={styles.legendText}>Move {Math.ceil((line.length - 1) / 2)}</Text></View>
      <View style={styles.selection}>
        <IconButton icon={ChevronLeft} label="Previous analysed move" disabled={selected === 0} onPress={() => choose(selected - 1)} />
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.move}>{moveLabel}</Text><Text style={styles.note}>{point ? `${formatScore(point.score)} · ${point.depth ? `Depth ${point.depth}` : 'Game result'}` : 'Not analysed yet'}{review?.quality ? ` · ${review.quality}` : ''}</Text></View>
        <IconButton icon={ChevronRight} label="Next analysed move" disabled={selected === line.length - 1} onPress={() => choose(selected + 1)} />
      </View>
      <View accessibilityLiveRegion="polite" style={styles.progressRow}>{running && <ActivityIndicator size="small" color={C.green} />}<Text style={styles.note}>{complete ? `${line.length - 1} half-moves analysed · Tap the plot to review` : `${completed} / ${line.length} positions · ${running ? 'Analysing game…' : 'Paused · Results saved'}`}</Text></View>
      {!complete && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completed / line.length * 100}%` }]} /></View>}
    </>}
    {!!error && <Body style={[styles.note, { color: '#AE4E3D' }]}>{error}</Body>}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 8, gap: 4, borderWidth: 1.5, borderColor: '#A5BF95', borderRadius: 14, backgroundColor: C.paper },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexGrow: 1 },
  title: { fontFamily: 'DM_700', fontSize: 14, color: C.ink },
  run: { minHeight: 44, paddingHorizontal: 11, borderRadius: 9, backgroundColor: C.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginLeft: 'auto' },
  stop: { backgroundColor: C.pale },
  runLabel: { fontFamily: 'DM_600', fontSize: 12, color: '#fff' },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completeLabel: { fontFamily: 'DM_600', fontSize: 10, color: C.green },
  note: { fontFamily: 'DM_400', color: C.muted, fontSize: 11, lineHeight: 16 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  legendText: { fontFamily: 'DM_500', fontSize: 10, color: C.muted },
  chart: { height: 144, borderRadius: 6, overflow: 'hidden' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.soft, borderRadius: 9 },
  move: { fontFamily: 'DM_700', fontSize: 12, color: C.ink },
  progressRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  progressTrack: { height: 3, backgroundColor: C.soft, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.green },
});
