import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronDown, FlipVertical2, GitBranch, Share2 } from 'lucide-react-native';
import { displayLine } from '../game/analysis';
import { mainLineIds, studyLines } from '../game/savedAnalysis';
import { notation } from '../game/engine';
import { VARIANTS } from '../game/variants';
import type { Tree } from '../state/GameContext';
import { Body, C, IconButton } from './ui';
import { Sheet } from './mobile/Sheet';

export function AnalysisLines({ tree, mainLine, selectLine, flip, share, width }: {
  tree: Tree; mainLine?: number[]; selectLine: (leaf: number) => void; flip: () => void; share: () => void; width: number;
}) {
  const [open, setOpen] = useState(false);
  const ids = mainLine ?? tree.gameSource?.mainLine ?? mainLineIds(tree);
  const lines = studyLines(tree, ids);
  const activeLeaf = displayLine(tree).at(-1)?.id ?? 0;
  const size = VARIANTS[tree.nodes[0].position.variant].size;
  return <>
    <View testID="analysis-lines" style={[styles.controls, { width }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to main line" accessibilityState={{ selected: activeLeaf === lines[0].leaf }} onPress={() => selectLine(lines[0].leaf)} style={[styles.main, activeLeaf === lines[0].leaf && styles.selected]}><Text style={styles.label}>Main line</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose analysis variation" onPress={() => setOpen(true)} style={styles.variations}><GitBranch size={15} color={C.green} /><Text style={styles.label}>Variations · {lines.length - 1}</Text><ChevronDown size={13} color={C.green} /></Pressable>
      <IconButton icon={FlipVertical2} label="Flip board" onPress={flip} />
      <IconButton icon={Share2} label="Share game and position" onPress={share} />
    </View>
    {open && <Sheet title="Game lines" subtitle="Select a line to review it on the board. All moves and the original game plot stay saved." onClose={() => setOpen(false)}>
      {lines.map(line => {
        const path = displayLine({ ...tree, current: line.leaf, reviewLeaf: line.leaf });
        return <Pressable key={line.leaf} accessibilityRole="button" accessibilityLabel={`Select ${line.label.toLowerCase()}`} accessibilityState={{ selected: activeLeaf === line.leaf }} onPress={() => { selectLine(line.leaf); setOpen(false); }} style={[styles.option, activeLeaf === line.leaf && styles.selected]}>
          <View style={{ flex: 1 }}><Text style={styles.name}>{line.label}</Text><Body style={styles.note}>{path.length - 1} half-moves · {path.slice(-3).flatMap(node => node.move ? [notation(node.move, size)] : []).join('  ') || 'Starting position'}</Body></View>{activeLeaf === line.leaf && <Check size={18} color={C.green} />}
        </Pressable>;
      })}
    </Sheet>}
  </>;
}
const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 10, paddingHorizontal: 3, gap: 2 },
  main: { minHeight: 44, paddingHorizontal: 9, justifyContent: 'center', borderRadius: 8 },
  variations: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: 'DM_600', fontSize: 11, color: C.green },
  selected: { backgroundColor: C.pale, borderColor: '#A5BF95' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, minHeight: 64 },
  name: { fontFamily: 'DM_700', fontSize: 14, color: C.ink },
  note: { fontSize: 11, color: C.muted, marginTop: 4 },
});
