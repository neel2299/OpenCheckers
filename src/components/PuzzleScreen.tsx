import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Lightbulb, ListOrdered, RotateCcw, Trophy } from 'lucide-react-native';
import { applyMove, coordinate, legalMoves, notation, type Move, type Position } from '../game/engine';
import { getPuzzlePosition, getPuzzleSolutionMoves, moveRoute, PUZZLES, puzzleLine, type Puzzle, type SolutionNode } from '../game/puzzles';
import { PUZZLE_LICENSE } from '../game/puzzlePack';
import { sideName, VARIANTS } from '../game/variants';
import { useGame } from '../state/GameContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import { moveCue } from '../feedback/events';
import { useAppActive } from '../hooks/useMotion';
import { Board } from './Board';
import { Body, Button, C, Heading, IconButton, Label, s } from './ui';
import { Sheet } from './mobile/Sheet';

type Step = { position: Position; move: Move | null };
export function PuzzleScreen({ puzzle }: { puzzle: Puzzle }) {
  const { markPuzzleSolved, solvedPuzzles } = useGame();
  const { play } = useFeedback();
  const focused = useIsFocused();
  const active = useAppActive();
  const dimensions = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: dimensions.width, height: dimensions.height - 130 });
  const [line, setLine] = useState<Step[]>(() => [{ position: getPuzzlePosition(puzzle), move: null }]);
  const [solution, setSolution] = useState<SolutionNode>(puzzle.solution);
  const [pending, setPending] = useState<{ route: string; next: SolutionNode } | null>(null);
  const [prefix, setPrefix] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Tap a piece, then its destination.');
  const [mistakes, setMistakes] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [panel, setPanel] = useState<'hint' | 'moves' | 'about' | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const walkthrough = useMemo(() => puzzleLine(puzzle), [puzzle]);
  const step = review === null ? line[line.length - 1] : walkthrough[review];
  const position = step.position;
  const size = VARIANTS[puzzle.variant].size;
  const solver = line[0].position.turn;
  const moves = useMemo(() => legalMoves(position), [position]);
  const candidates = moves.filter(move => prefix.every((square, index) => move.path[index] === square));
  const destinations = prefix.length ? [...new Set(candidates.flatMap(move => move.path[prefix.length] === undefined ? [] : [move.path[prefix.length]]))] : [];
  const hint = review === null && !pending && !complete ? getPuzzleSolutionMoves(puzzle, position, solution)[0] : undefined;
  const wide = viewport.width >= 740 && viewport.width > viewport.height;
  const compact = viewport.height < 580;
  const boardWidth = Math.max(144, Math.min(wide ? viewport.width - 350 : viewport.width - 24, viewport.height - (wide ? 30 : compact ? 224 : 248), 520));
  const disabled = complete || pending !== null || review !== null || !focused || !active;

  useEffect(() => {
    if (complete) markPuzzleSolved(puzzle.id);
  }, [complete, markPuzzleSolved, puzzle.id]);

  useEffect(() => {
    if (!pending || !focused || !active || review !== null) return;
    const timer = setTimeout(() => {
      const reply = legalMoves(position).find(move => moveRoute(move, size) === pending.route);
      if (!reply) { setFeedback('This position could not be continued. Restart the puzzle.'); return; }
      setLine(current => [...current, { position: applyMove(position, reply), move: reply }]);
      setSolution(pending.next); setPending(null); play(moveCue(position, reply));
      setFeedback('Your turn. Continue the combination.');
    }, 650);
    return () => clearTimeout(timer);
  }, [pending, focused, active, review, position, size, play]);

  const commit = (move: Move) => {
    if (disabled || !moves.some(legal => legal.id === move.id)) return;
    const route = moveRoute(move, size);
    const branch = solution[route];
    setPrefix([]);
    if (!branch) { setMistakes(count => count + 1); setFeedback(`${notation(move, size)} misses the combination. Try a different move.`); return; }
    setLine(current => [...current, { position: applyMove(position, move), move }]);
    setHintLevel(0);
    if (branch.reply) {
      setPending({ route: branch.reply, next: branch.next ?? {} });
      setFeedback('Good move. Your opponent is replying…'); play(moveCue(position, move));
    } else {
      setComplete(true); setSolution({}); setFeedback('Puzzle solved. Nicely calculated!'); play('victory');
    }
  };
  const onSquare = (index: number) => {
    if (disabled) return;
    if (prefix.length && destinations.includes(index)) {
      const next = [...prefix, index];
      const move = candidates.find(move => move.path.length === next.length && move.path.every((square, i) => square === next[i]));
      if (move) commit(move); else { setPrefix(next); play('capture'); }
    } else if (position.board[index]?.side === solver && moves.some(move => move.from === index)) {
      setPrefix(prefix[0] === index ? [] : [index]); play('select');
    } else setPrefix([]);
  };
  const preview = useMemo(() => {
    if (prefix.length < 2) return position;
    const board = position.board.slice();
    const piece = board[prefix[0]]!;
    board[prefix[0]] = null;
    candidates[0]?.captures.slice(0, prefix.length - 1).forEach(square => { board[square] = null; });
    const promoted = VARIANTS[puzzle.variant].promotion === 'continue' && prefix.some(square => Math.floor(square / size) === (solver === 'white' ? 0 : size - 1));
    board[prefix[prefix.length - 1]] = { ...piece, king: piece.king || promoted };
    return { ...position, board };
  }, [prefix, position, candidates, puzzle.variant, size, solver]);
  const restart = () => {
    setLine([{ position: getPuzzlePosition(puzzle), move: null }]); setSolution(puzzle.solution); setPending(null);
    setPrefix([]); setComplete(false); setMistakes(0); setHintLevel(0); setReview(null); setFeedback('A fresh board. Find the combination.');
  };
  const nextPuzzle = () => {
    const group = PUZZLES.filter(item => item.level === puzzle.level && item.variant === puzzle.variant);
    const next = group.find(item => item.id !== puzzle.id && !solvedPuzzles.includes(item.id)) ?? group[group.findIndex(item => item.id === puzzle.id) + 1];
    if (next) router.replace({ pathname: '/puzzle', params: { id: next.id } });
    else router.replace({ pathname: '/puzzles', params: { level: Math.min(5, puzzle.level + 1) } });
  };
  const back = () => router.navigate({ pathname: '/puzzles', params: { level: puzzle.level } });
  const heading = <View style={{ gap: 5, backgroundColor: C.paper, padding: 8, borderRadius: 14 }}>
    <View style={s.row}><IconButton icon={ArrowLeft} label="Back to puzzles" onPress={back} /><View style={{ flex: 1 }}><Label>LEVEL {puzzle.level} · {VARIANTS[puzzle.variant].name.toUpperCase()}</Label><Heading style={{ fontSize: 19, lineHeight: 25 }}>{puzzle.title}</Heading></View><IconButton icon={BookOpen} label="Puzzle details and source" onPress={() => setPanel('about')} /></View>
    <Body numberOfLines={2} style={{ fontSize: 12, lineHeight: 17 }}>{puzzle.objective}</Body>
  </View>;
  const status = <View accessibilityLiveRegion="polite" style={[styles.status, complete && { backgroundColor: C.pale }]}>
    {complete && <Trophy size={17} color={C.green} />}<View style={{ flex: 1 }}><Text style={{ color: mistakes && !complete && feedback.includes('misses') ? '#AE4E3D' : C.green, fontFamily: 'DM_600', fontSize: 12, lineHeight: 17 }}>{review !== null ? `Solution · step ${review} / ${walkthrough.length - 1}` : feedback}</Text></View>
    <Text style={styles.small}>{sideName(solver)} · {Math.ceil((line.length - 1) / 2)}/{Math.ceil((walkthrough.length - 1) / 2)}</Text>
  </View>;
  const controls = <View style={{ gap: 8, backgroundColor: C.paper, padding: 8, borderRadius: 14 }}>
    {review !== null ? <View style={styles.actions}><IconButton icon={ChevronLeft} label="Previous solution move" onPress={() => setReview(Math.max(0, review - 1))} disabled={review === 0} /><Body style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{review === 0 ? 'Starting position' : notation(walkthrough[review].move!, size)}</Body><IconButton icon={ChevronRight} label="Next solution move" onPress={() => setReview(Math.min(walkthrough.length - 1, review + 1))} disabled={review === walkthrough.length - 1} /><Button secondary onPress={restart}>Try yourself</Button></View> : complete ? <View style={styles.actions}><Button secondary onPress={() => { setPrefix([]); setReview(0); }} style={{ flex: 1 }}>Review solution</Button><Button icon={ArrowRight} onPress={nextPuzzle} style={{ flex: 1 }}>Next puzzle</Button></View> : <View style={styles.actions}>
      <Button secondary icon={Lightbulb} label="Puzzle hint" disabled={!!pending} onPress={() => { setHintLevel(level => Math.max(1, level)); setPanel('hint'); }} style={styles.action}>Hint</Button>
      <Button secondary icon={BookOpen} label="Show puzzle solution" onPress={() => { setPrefix([]); setPending(null); setReview(0); }} style={styles.action}>Solution</Button>
      <IconButton icon={RotateCcw} label="Restart puzzle" onPress={restart} /><IconButton icon={ListOrdered} label="Puzzle move list" onPress={() => setPanel('moves')} />
    </View>}
    {!compact && <Text style={styles.small}>{review !== null ? 'Walk through the moves, then try it yourself. Viewing a solution does not mark a puzzle solved.' : complete ? puzzle.explanation : `Play as ${sideName(solver)} · ${puzzle.theme} · Opponent replies automatically`}</Text>}
  </View>;
  const board = <View style={styles.board}><Board position={preview} width={boardWidth} flipped={solver === 'black'} selected={prefix[0] ?? null} destinations={destinations} path={prefix} lastMove={step.move} hint={hintLevel >= 2 ? hint : undefined} onSquare={onSquare} disabled={disabled} /></View>;
  return <View style={styles.root} onLayout={event => { const { width, height } = event.nativeEvent.layout; setViewport(current => current.width === width && current.height === height ? current : { width, height }); }}>
    {wide ? <View style={styles.landscape}>{board}<View style={{ width: 310, gap: 14 }}>{heading}{status}{controls}</View></View> : <>{heading}{board}{status}{controls}</>}
    {panel && <Sheet title={panel === 'hint' ? 'A nudge in the right direction' : panel === 'moves' ? 'Puzzle moves' : 'About this puzzle'} onClose={() => setPanel(null)}>
      {panel === 'hint' && <><Label>HINT {hintLevel} OF 3</Label><Body>{hintLevel === 1 ? puzzle.hint : hintLevel === 2 && hint ? `Start with your piece on ${coordinate(hint.from, size)}. It is highlighted on the board.` : hint ? `Play ${notation(hint, size)}: ${moveRoute(hint, size).split('-').join(' → ')}. Tap each landing square to complete the move.` : 'Restart the puzzle to explore the idea again.'}</Body><Button secondary disabled={hintLevel >= 3} onPress={() => setHintLevel(level => Math.min(3, level + 1))}>Another hint</Button><Button onPress={() => setPanel(null)}>Back to the board</Button></>}
      {panel === 'moves' && <><Body>{line.length === 1 ? 'No moves yet. Make your first move on the board.' : line.slice(1).map((step, index) => `${index + 1}. ${sideName(line[index].position.turn)} ${notation(step.move!, size)}`).join('\n')}</Body><Body style={{ color: C.muted }}>Attempts: {mistakes} incorrect · {Math.ceil((line.length - 1) / 2)} moves played</Body></>}
      {panel === 'about' && <><Label>{puzzle.theme.toUpperCase()}</Label><Body>{review !== null || complete ? puzzle.explanation : puzzle.objective}</Body><Body style={styles.small}>Source: {puzzle.source.name} · {puzzle.source.license}</Body>{puzzle.source.url && <><Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(puzzle.source.url!).catch(() => setFeedback('Source: github.com/ShadowfetchStudio/shadow-checkers')); }} style={{ minHeight: 44, justifyContent: 'center' }}><Body style={{ color: C.green }}>View original puzzle collection ↗</Body></Pressable><Body style={styles.small}>{PUZZLE_LICENSE}</Body></>}</>}
    </Sheet>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, padding: 12, gap: 8 },
  landscape: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  status: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, padding: 9, borderRadius: 12 },
  small: { fontFamily: 'DM_400', fontSize: 11, lineHeight: 16, color: C.muted },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' }, action: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
});
