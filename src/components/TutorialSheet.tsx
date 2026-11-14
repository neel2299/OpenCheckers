import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, Compass, Cpu, GraduationCap, Hash, Layers, Sparkles, Swords } from 'lucide-react-native';
import { useGame } from '../state/GameContext';
import { Body, Button, C, Card, Label, s } from './ui';
import { Sheet } from './mobile/Sheet';

const SECTIONS = [
  {
    id: 'basics',
    tab: 'Basics',
    icon: Swords,
    title: 'How to play & the 4 variants',
    intro: 'OpenCheckers brings four official tournament rulesets to one board. Every variant shares core checkers fundamentals, with key tactical twists.',
    items: [
      {
        heading: 'Moving & compulsory capture',
        body: 'Tap one of your pieces, then tap a highlighted dark square. Men step diagonally forward one square. If a jump over an opponent piece is available, capturing is mandatory—you cannot play a quiet move instead.',
      },
      {
        heading: 'Multi-jumps & changing your path',
        body: 'If your piece lands from a capture and can jump again, keep tapping the next landing square. If you start a multi-jump and want to pick a different branch, tap your piece’s starting square to cancel and re-select.',
      },
      {
        heading: 'Short kings vs. flying kings',
        body: 'In English checkers (8 × 8), kings step and jump one square forward or backward, and crowning immediately ends your turn. In International (10 × 10), Russian, and Brazilian draughts, kings "fly" any distance along open diagonals.',
      },
      {
        heading: 'Any capture vs. maximum capture',
        body: 'English and Russian allow you to choose any complete capture sequence. International and Brazilian enforce the Maximum Capture rule: you must choose a sequence that captures the greatest total number of enemy pieces.',
      },
    ],
  },
  {
    id: 'notation',
    tab: 'Notation',
    icon: Hash,
    title: 'Reading coordinate moves & PDN',
    intro: 'Every variant in OpenCheckers uses chess-style coordinates for move lists, hints, puzzle solutions, and engine lines.',
    items: [
      {
        heading: 'Files and ranks',
        body: 'A square combines its column letter and row number, such as c3 or e5. Read these coordinates from the board edges. Flipping the board changes your view, while each square keeps its coordinate.',
      },
      {
        heading: 'Coordinates on every board',
        body: 'English, Russian, and Brazilian boards use columns a–h and rows 1–8. International uses columns a–j and rows 1–10. Optional checkers square numbers can be shown alongside coordinates; move lists always use coordinates.',
      },
      {
        heading: 'Quiet moves (-) and captures (x)',
        body: 'A dash means a simple step: c3-d4. An x means a capture: c3xe5. A multi-jump includes every landing square, such as c3xe5xg7. Russian PDN files can also use colons between capture coordinates.',
      },
      {
        heading: 'FEN positions & PDN games',
        body: 'FEN is a snapshot of a board (for example, W:Wc3,d4,Ka3:Bb6,Kd6 where W = Ivory, B = Coral, and K = King). PDN stores an entire game. Copied and shared games use coordinates. Imported games with older square numbers are displayed as coordinates too.',
      },
    ],
  },
  {
    id: 'analyser',
    tab: 'Analyser',
    icon: Cpu,
    title: 'How to read the pro engine analyser',
    intro: 'The analysis board follows the conventions of professional checkers engines like KingsRow, Scan (Lidraughts), Cake (CheckerBoard), and Kallisto.',
    items: [
      {
        heading: 'Centiman evaluation (+1.00 = 1 man)',
        body: 'Scores are always shown from Ivory’s perspective in hundredths of a man ("centimen"). +1.00 means Ivory is ahead by about one piece; −1.00 favors Coral by one piece. Between −0.25 and +0.25 is the balanced draw zone; ±0.35 to ±0.75 is a clear positional edge.',
      },
      {
        heading: 'Depth, nodes & search speed (kN/s)',
        body: 'Depth counts how many plies (half-moves) ahead the engine has searched. Because captures are forced, the engine automatically extends tactical jump sequences beyond the nominal depth so it never misjudges mid-exchange.',
      },
      {
        heading: 'Multi-PV lines & score delta',
        body: 'A Principal Variation (PV) is the engine’s predicted best sequence for both players. PV 1 is the top move ("Best"). PV 2 and PV 3 show alternative moves along with how much score they give up (for example, "Book / Equal" within 0.15, or "−0.60 ?" for a costly inaccuracy).',
      },
      {
        heading: 'Tempo (pips), Center & Back rank',
        body: 'Professional engines weigh three structural pillars shown in the Engine sheet: Tempo (total forward advancement of men, crucial for endgame Opposition / "The Move"), Center (control of central dark squares), and Back rank (guards left on the home row to block enemy crowning).',
      },
    ],
  },
  {
    id: 'workflow',
    tab: 'Tools',
    icon: Compass,
    title: 'Mastering the app workflow',
    intro: 'Use the built-in club tools to practice, review your games, and test "what-if" variations offline.',
    items: [
      {
        heading: 'Computer analysis of a game',
        body: 'Computer analysis is available for completed games and imported PDNs. Each Analyse game or Run again request saves a separate analysis; the latest five are kept under New analysis. Resume continues the same request. The original game plot stays saved while you explore variations.',
      },
      {
        heading: 'Branching & variations in Analysis',
        body: 'Step back to an earlier turn and play a different move to create a variation. Use Main line and Variations beside the board to return to any line. The live evaluation at the top follows the current position; the saved plot stays attached to the original game.',
      },
      {
        heading: 'Position editor & custom setups',
        body: 'Tap Editor on the Analysis tab to place or erase Ivory/Coral men and kings, choose who moves next, and test any endgame or book puzzle with the engine.',
      },
      {
        heading: 'Tactical puzzles & club archive',
        body: 'Visit the Learn tab to solve tactical combinations across all four variants and review your completed games in Analysis with one tap.',
      },
    ],
  },
] as const;

export function TutorialSheet() {
  const { tutorialOpen, closeTutorial, tutorialSeenCount } = useGame();
  const [step, setStep] = useState(0);
  if (!tutorialOpen) return null;

  const active = SECTIONS[step];
  const autoPopupBadge = tutorialSeenCount > 0 && tutorialSeenCount <= 3
    ? `Welcome guide (${tutorialSeenCount} of 3 auto-popups)`
    : 'Interactive club guide';

  return <Sheet
    title="OpenCheckers guide"
    subtitle={`${autoPopupBadge} · Reopen anytime in Learn or Settings.`}
    onClose={closeTutorial}
    tall
    footer={<View style={styles.footerRow}>
      <Button secondary icon={ChevronLeft} label="Previous tutorial section" disabled={step === 0} onPress={() => setStep(s => Math.max(0, s - 1))} style={{ flex: 1 }}>Back</Button>
      {step < SECTIONS.length - 1
        ? <Button icon={ChevronRight} label="Next tutorial section" onPress={() => setStep(s => Math.min(SECTIONS.length - 1, s + 1))} style={{ flex: 1 }}>Next: {SECTIONS[step + 1].tab}</Button>
        : <Button icon={Check} label="Finish tutorial" onPress={closeTutorial} style={{ flex: 1 }}>Got it, let’s play</Button>}
    </View>}
  >
    <View style={styles.noticeBanner}>
      <GraduationCap size={18} color={C.green} />
      <Body style={{ fontSize: 12, lineHeight: 18, flex: 1 }}>
        This tutorial pops up on your <Text style={{ fontFamily: 'DM_700', color: C.green }}>first 3 visits</Text>. You can always reach it later in the <Text style={{ fontFamily: 'DM_700', color: C.green }}>Learn</Text> tab or under <Text style={{ fontFamily: 'DM_700', color: C.green }}>Settings</Text>.
      </Body>
    </View>

    <View style={styles.tabRow}>
      {SECTIONS.map((sec, idx) => {
        const Icon = sec.icon;
        const selected = idx === step;
        return <Pressable
          key={sec.id}
          accessibilityRole="tab"
          accessibilityLabel={`Tutorial section: ${sec.tab}`}
          accessibilityState={{ selected }}
          onPress={() => setStep(idx)}
          style={[styles.tabPill, selected && styles.tabPillActive]}
        >
          <Icon size={14} color={selected ? C.green : C.muted} />
          <Text style={[styles.tabText, selected && styles.tabTextActive]}>{sec.tab}</Text>
        </Pressable>;
      })}
    </View>

    <Card style={{ gap: 12 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Sparkles size={17} color={C.green} />
        <Text style={{ fontFamily: 'DM_700', fontSize: 17, color: C.ink, flex: 1 }}>{active.title}</Text>
      </View>
      <Body style={{ fontSize: 13, color: C.muted }}>{active.intro}</Body>
      {active.items.map(item => <View key={item.heading} style={styles.itemCard}>
        <Label style={{ color: C.green, fontSize: 12 }}>{item.heading}</Label>
        <Body style={{ fontSize: 13, lineHeight: 19, marginTop: 4 }}>{item.body}</Body>
      </View>)}
    </Card>

    <View style={styles.quickRef}>
      <View style={[s.row, { gap: 6 }]}>
        <Layers size={14} color={C.muted} />
        <Label>Quick score reference</Label>
      </View>
      <View style={styles.refGrid}>
        {[
          { range: '0.00 to ±0.25', meaning: 'Balanced / Draw zone' },
          { range: '±0.30 to ±0.75', meaning: 'Positional advantage' },
          { range: '±1.00 (100 pts)', meaning: '≈ 1 Man advantage' },
          { range: 'PV 1 / Δ score', meaning: 'Best line & alternative cost' },
        ].map(ref => <View key={ref.range} style={styles.refCell}>
          <Text style={{ fontFamily: 'DM_700', fontSize: 12, color: C.green }}>{ref.range}</Text>
          <Body style={{ fontSize: 11, color: C.muted }}>{ref.meaning}</Body>
        </View>)}
      </View>
    </View>
  </Sheet>;
}

const styles = StyleSheet.create({
  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.pale, borderWidth: 1, borderColor: '#B8CAAC' },
  tabRow: { flexDirection: 'row', gap: 6 },
  tabPill: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, paddingHorizontal: 6 },
  tabPillActive: { backgroundColor: C.pale, borderColor: '#91AC84' },
  tabText: { fontFamily: 'DM_500', fontSize: 12, color: C.muted },
  tabTextActive: { fontFamily: 'DM_700', color: C.green },
  itemCard: { padding: 12, borderRadius: 10, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line },
  quickRef: { padding: 14, borderRadius: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, gap: 8 },
  refGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  refCell: { width: '47%', flexGrow: 1, padding: 8, borderRadius: 8, backgroundColor: C.soft },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
