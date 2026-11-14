import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChartNoAxesCombined, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Copy, Cpu, Eraser, Flag, FlipVertical2, Lightbulb, ListOrdered, Pencil, Plus, RotateCcw, Share2, Upload } from 'lucide-react-native';
import { addMove, ancestors, newTree, treeFromLine, useGame } from '../state/GameContext';
import { fromFen, legalMoves, materialSummary, notation, outcome, toFen, type Move, type Piece, type Position } from '../game/engine';
import { search, type SearchResult } from '../game/ai';
import { exportPdn, importPositionOrPdn } from '../game/pdn';
import { VARIANTS, computerLevel, opposite, sideName } from '../game/variants';
import { Board, Disc } from './Board';
import { Body, Button, C, IconButton, Label, Pill, s } from './ui';
import { EnginePanel, EvaluationGraph, MoveHistory, displayLine, formatScore } from './GamePanels';
import { Sheet } from './mobile/Sheet';
import { Action } from './mobile/Action';
import { GameSetupSheet } from './mobile/GameSetupSheet';
import { useFeedback } from '../feedback/FeedbackProvider';
import { useMoveFeedback } from '../hooks/useMoveFeedback';
import { useAppActive } from '../hooks/useMotion';
import { AnimatedToast } from './AnimatedToast';
import { OpponentAvatar } from './OpponentAvatar';
import { GameResultSheet } from './GameResultSheet';
import { useDonation } from '../support/DonationProvider';
import { ComputerAnalysis } from './ComputerAnalysis';
import { useComputerAnalysis } from '../hooks/useComputerAnalysis';
import { fullGameStudy, selectStudyLine } from '../game/savedAnalysis';
import { AnalysisLines } from './AnalysisLines';
import { NewAnalysisSheet } from './NewAnalysisSheet';

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function GameScreen({ analysis = false }: { analysis?: boolean }) {
  const { config, game, setGame, study, setStudy, newStudy, activeAnalysis, clocks, setClocks, recordGameOutcome, startGame, analyzeGame, loadArchivedGame, completedGame, ratings, ready, storageError, result: gameResult, setResult: setGameResult } = useGame();
  const tree = analysis ? study : game;
  const setTree = analysis ? setStudy : setGame;
  const node = tree.nodes[tree.current];
  const position = node.position;
  const rules = VARIANTS[position.variant];
  const pathNodes = useMemo(() => ancestors(tree), [tree]);
  const finish = useMemo(() => outcome(position, pathNodes.map(n => n.position)), [position, pathNodes]);
  const { play } = useFeedback();
  const { visible: donationVisible } = useDonation();
  const appActive = useAppActive();
  const focused = useIsFocused();
  useMoveFeedback(tree, !analysis && Boolean(finish), Boolean(finish?.winner && (config.mode === 'friend' || finish.winner === config.side)));
  const [prefix, setPrefix] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(config.side === 'black');
  const [searchState, setSearchState] = useState<{ position: Position; done: boolean } | null>(null);
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [engine, setEngine] = useState<SearchResult | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [hintRequested, setHintRequested] = useState(false);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<'position' | 'resign' | null>(null);
  const [panel, setPanel] = useState<'moves' | 'engine' | 'new-analysis' | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [dismissedResultId, setDismissedResultId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [brush, setBrush] = useState<Piece | null>({ side: 'white', king: false });
  const [editPosition, setEditPosition] = useState<Position | null>(null);
  const [fen, setFen] = useState('');
  const [fenError, setFenError] = useState('');
  const { width, height } = useWindowDimensions();
  const [viewport, setViewport] = useState({ width, height: height - 128 });
  const wide = viewport.width >= 740 && viewport.width > viewport.height;
  const compact = viewport.height < 570;
  const boardWidth = Math.min(wide ? viewport.width - 350 : viewport.width - 24, Math.max(wide ? 150 : analysis ? (compact && !editing ? 184 : 216) : 236, viewport.height - (wide ? 116 : editing ? 328 : analysis ? (compact ? 360 : 392) : 292)), wide ? 560 : 520);
  const atLive = tree.current === tree.nodes.length - 1;
  const computerAnalysis = useComputerAnalysis(tree, appActive && focused && !donationVisible && analysis && !editing);
  const shouldAnalyze = appActive && focused && !donationVisible && analysis && engineEnabled && !editing && (!computerAnalysis.running || computerAnalysis.offMainLine);
  const shouldPlay = appActive && focused && !donationVisible && !analysis && ready && config.mode === 'computer' && position.turn !== config.side && !finish && !gameResult && atLive;
  const busy = Boolean((shouldAnalyze || shouldPlay) && !(searchState?.position === position && searchState.done));
  const canMove = ready && !editing && (analysis || (!finish && !gameResult && atLive && (config.mode === 'friend' || position.turn === config.side)));
  const moves = useMemo(() => legalMoves(position), [position]);
  const candidates = moves.filter(move => prefix.every((sq, i) => move.path[i] === sq));
  const destinations = prefix.length ? [...new Set(candidates.map(move => move.path[prefix.length]).filter((n): n is number => n !== undefined))] : [];
  const notify = (text: string) => setToast(text);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); } }, [toast]);
  // Position-local UI is reset before rendering a different position, so an old
  // hint or partially entered capture can never leak into the next turn.
  const [previousPosition, setPreviousPosition] = useState(position);
  const [orientationSide, setOrientationSide] = useState(config.side);
  if (previousPosition !== position) {
    setPreviousPosition(position); setPrefix([]); setHint(null); setHintRequested(false); setEngine(null);
  }
  if (orientationSide !== config.side) {
    setOrientationSide(config.side);
    if (!analysis) setFlipped(config.side === 'black');
  }

  useEffect(() => {
    const controller = new AbortController();
    if (!shouldAnalyze && !shouldPlay) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const response = await search(position, { elo: config.elo, analysis: shouldAnalyze, signal: controller.signal, history: pathNodes.map(n => n.position) });
        if (controller.signal.aborted) return;
        if (shouldAnalyze) setEngine(response);
        else if (response.move) setGame(current => current.nodes[current.current].position === position ? addMove(current, response.move!) : current);
      } catch { if (!controller.signal.aborted) notify('The engine could not finish. Try a lower level or restart the game.'); }
      finally { if (!controller.signal.aborted) setSearchState({ position, done: true }); }
    }, shouldAnalyze ? 200 : 350);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [config.elo, position, shouldAnalyze, shouldPlay, pathNodes, setGame]);

  useEffect(() => {
    if (!hintRequested || analysis) return;
    const controller = new AbortController();
    search(position, { analysis: true, signal: controller.signal, history: pathNodes.map(n => n.position) }).then(response => {
      if (!controller.signal.aborted) { setHint(response.move); setHintRequested(false); if (response.move) notify(`Try ${notation(response.move, rules.size)}. Tap the highlighted piece to play.`); }
    }).catch(() => { if (!controller.signal.aborted) { setHintRequested(false); notify('Hint unavailable. Please try again.'); } });
    return () => controller.abort();
  }, [hintRequested, analysis, position, pathNodes, rules.size]);

  useEffect(() => {
    if (analysis || !ready || (!finish && !gameResult)) return;
    const winner = finish ? finish.winner : gameResult?.startsWith('Ivory') ? 'white' : gameResult?.startsWith('Coral') ? 'black' : null;
    const reason = finish ? finish.reason : gameResult ?? 'Game completed';
    recordGameOutcome(winner, reason);
  }, [analysis, ready, finish, gameResult, recordGameOutcome]);

  useEffect(() => {
    if (analysis || !ready || !appActive || !focused || donationVisible || !atLive || finish || gameResult || !clocks || !(config.timeControl && config.timeControl > 0)) return;
    const turn = position.turn;
    const timer = setInterval(() => {
      setClocks(current => {
        if (!current) return current;
        const nextVal = current[turn] - 1;
        if (nextVal <= 0) {
          setGameResult(`${sideName(opposite(turn))} wins on time`);
          play(config.mode === 'friend' || opposite(turn) === config.side ? 'victory' : 'finish');
          return { ...current, [turn]: 0 };
        }
        return { ...current, [turn]: nextVal };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [analysis, ready, appActive, focused, donationVisible, atLive, finish, gameResult, clocks, config.timeControl, config.mode, config.side, position.turn, setClocks, setGameResult, play]);

  const commit = (move: Move) => {
    // Candidate buttons and board taps both pass through legality validation.
    const valid = moves.find(m => m.id === move.id);
    if (!valid || (!analysis && !canMove)) return;
    setTree(current => addMove(current, valid)); setPrefix([]); setHint(null);
  };
  const onSquare = (index: number) => {
    if (editing && editPosition) {
      setEditPosition({ ...editPosition, board: editPosition.board.map((p, i) => i === index ? brush : p) }); return;
    }
    if (!canMove) return;
    if (prefix.length && destinations.includes(index)) {
      const next = [...prefix, index];
      const complete = candidates.find(m => m.path.length === next.length && m.path.every((sq, i) => sq === next[i]));
      if (complete) commit(complete); else { setPrefix(next); play('capture'); }
      return;
    }
    if (prefix.length > 1) {
      if (index === prefix[0]) { setPrefix([]); play('select'); }
      return;
    }
    if (position.board[index]?.side === position.turn && moves.some(m => m.from === index)) { setPrefix(prefix[0] === index ? [] : [index]); play('select'); }
    else { setPrefix([]); if (position.board[index]?.side === position.turn && moves[0]?.captures.length) notify(rules.maximumCapture ? 'A capture is required. Choose a sequence that takes the most pieces.' : 'A capture is available and must be taken.'); }
  };
  const preview = useMemo(() => {
    if (editing && editPosition) return editPosition;
    if (prefix.length < 2) return position;
    const board = position.board.slice(), piece = board[prefix[0]]!;
    board[prefix[0]] = null;
    candidates[0]?.captures.slice(0, prefix.length - 1).forEach(i => { board[i] = null; });
    board[prefix[prefix.length - 1]] = { ...piece, king: piece.king || (rules.promotion === 'continue' && prefix.some(i => Math.floor(i / rules.size) === (piece.side === 'white' ? 0 : rules.size - 1))) };
    return { ...position, board };
  }, [editing, editPosition, prefix, position, candidates, rules]);

  const navigate = useCallback((id: number) => { setPrefix([]); setTree(current => ({ ...current, current: id, reviewLeaf: displayLine(current).at(-1)?.id })); }, [setTree]);
  const navigateMainLine = (id: number) => { setPrefix([]); setTree(current => ({ ...current, current: id, reviewLeaf: computerAnalysis.line.at(-1)?.id })); };
  const selectLine = (leaf: number) => { setPrefix([]); setStudy(current => selectStudyLine(current, leaf)); };
  const back = () => { if (node.parent !== null) navigate(node.parent); };
  const forward = () => { if (node.children.length) navigate(node.children[0]); };
  const toEnd = () => { const line = displayLine(tree); navigate(line[line.length - 1].id); };
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || (!editing && (analysis || atLive))) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editing) { setEditing(false); setEditPosition(null); }
      else { const line = displayLine(tree); navigate(line[line.length - 1].id); }
      return true;
    });
    return () => subscription.remove();
  }, [editing, analysis, atLive, tree, navigate]));
  const undo = () => {
    if (finish || gameResult) return;
    if (!atLive) { toEnd(); return; }
    let target = node.parent;
    if (target === null) return;
    if (config.mode === 'computer' && tree.nodes[target].position.turn !== config.side && tree.nodes[target].parent !== null) target = tree.nodes[target].parent;
    const nodes = tree.nodes.slice(0, target! + 1).map(n => ({ ...n, children: n.children.filter(id => id <= target!) }));
    setGame({ nodes, current: target! }); setGameResult(null); play('undo');
  };
  const closeResult = () => setDismissedResultId(completedGame?.id ?? null);
  const analyze = () => {
    if (completedGame?.pdn) loadArchivedGame(completedGame); else analyzeGame();
    closeResult();
    router.navigate('/analysis');
  };
  const showPosition = () => { setFen(toFen(position, true)); setFenError(''); setDialog('position'); };
  const usePosition = () => {
    try {
      const importedLine = importPositionOrPdn(fen, position.variant);
      const imported = treeFromLine(importedLine);
      newStudy(importedLine.length > 1 ? fullGameStudy(imported, 'pdn', `Imported ${VARIANTS[importedLine[0].position.variant].name} game`) : imported);
      setDialog(null);
      notify(importedLine.length > 1 ? `Loaded PDN game (${importedLine.length - 1} moves).` : 'Position loaded. Make a move to explore.');
    }
    catch (error) { setFenError((error as Error).message); }
  };
  const startEditor = () => { setEditPosition({ ...position, board: position.board.slice() }); setEditing(true); setPrefix([]); };
  const finishEditor = () => {
    if (!editPosition) return;
    try { const valid = fromFen(toFen(editPosition), editPosition.variant); newStudy(newTree(valid)); setEditing(false); setEditPosition(null); }
    catch (error) { notify((error as Error).message); }
  };
  const status = editing ? 'Set up a position. Tap a square to place a piece.' : (!analysis && gameResult) ? gameResult : finish ? `${finish.winner ? sideName(finish.winner) + ' wins' : 'Game drawn'} · ${finish.reason}` : !atLive && !analysis ? 'Reviewing your game' : busy && !analysis ? 'The engine is finding its next move…' : prefix.length > 1 ? 'Keep going. Complete your capture.' : moves[0]?.captures.length ? `${sideName(position.turn)} to move · capture required` : `${!analysis && config.mode === 'computer' && position.turn === config.side ? 'Your' : sideName(position.turn) + '’s'} turn. Find your next move.`;
  const closePanel = () => setPanel(null);
  const moveCount = pathNodes.length - 1;
  const material = useMemo(() => materialSummary(preview), [preview]);
  const barWidth = wide ? Math.max(boardWidth, 304) : boardWidth;
  const analysisWidth = Math.min(viewport.width - 24, Math.max(barWidth, 320));
  const currentScore = computerAnalysis.currentPoint?.score ?? engine?.score;
  const currentDepth = computerAnalysis.currentPoint?.depth ?? engine?.depth;
  const navigation = <View testID="move-navigation" style={styles.navigation}>
    <IconButton icon={ChevronFirst} label="First position" onPress={() => navigate(0)} disabled={node.parent === null || editing} />
    <IconButton icon={ChevronLeft} label="Previous move" onPress={back} disabled={node.parent === null || editing} />
    <Body style={{ fontFamily: 'DM_600', fontSize: 12, textAlign: 'center', flex: 1 }}>{moveCount} / {displayLine(tree).length - 1}</Body>
    <IconButton icon={ChevronRight} label="Next move" onPress={forward} disabled={!node.children.length || editing} />
    <IconButton icon={ChevronLast} label="Last position" onPress={toEnd} disabled={!node.children.length || editing} />
  </View>;
  const context = analysis ? <View testID="analysis-header" style={styles.analysisHeader}>
    {editing ? <Button secondary onPress={() => { setEditing(false); setEditPosition(null); }}>Cancel</Button> : <Button secondary icon={Plus} label="New analysis" disabled={!ready} onPress={() => setPanel('new-analysis')}>New analysis</Button>}
    <Pressable accessibilityRole="button" accessibilityLabel="Current position evaluation" onPress={() => setPanel('engine')} style={styles.liveScore}>
      <Text style={styles.evaluation}>{currentScore === undefined ? '…' : formatScore(currentScore)}</Text>
      <Text style={styles.evaluationNote}>{currentScore === undefined ? 'Calculating evaluation' : Math.abs(currentScore) > 9000 ? 'Game result' : `${currentScore >= 0 ? '+' : ''}${Math.round(currentScore)} cp · Depth ${currentDepth ?? 0}`}</Text>
    </Pressable>
  </View> : <View style={styles.context}>
    <View style={{ flex: 1 }}><Text style={styles.variant}>{editing ? 'Position editor' : `${rules.name} checkers`}</Text><Body style={{ fontSize: 12, color: C.muted }}>
      {editing ? 'Tap a dark square to place or remove a piece' : analysis ? `${rules.size} × ${rules.size} · Explore any legal move` : `${rules.size} × ${rules.size} · ${config.mode === 'computer' ? computerLevel(config.elo).name : '2 players'}`}
      {!analysis && !editing && config.mode === 'computer' && <Text style={{ fontFamily: 'DM_700', color: C.green }}> · ~{config.elo}</Text>}
      {!analysis && !editing && Boolean(config.timeControl && config.timeControl > 0) && <Text style={{ fontFamily: 'DM_600', color: C.muted }}> · {config.timeControl}m</Text>}
    </Body></View>
    <Button secondary icon={Plus} label="New game settings" onPress={() => setSetupOpen(true)} style={styles.contextButton}>New game</Button>
  </View>;
  const boardArea = <View style={styles.boardArea}>
    {!(analysis && compact) && <View style={[styles.players, { width: barWidth }]}>{(['white', 'black'] as const).map(side => {
      const sideMat = material[side];
      const isTurn = position.turn === side;
      const computer = !analysis && config.mode === 'computer';
      const opponent = computer && side !== config.side;
      return <View key={side} style={[styles.player, isTurn && styles.activePlayer]}>
        {opponent ? <OpponentAvatar elo={config.elo} size={28} /> : <Disc piece={{ side, king: false }} size={18} />}
        <View style={{ flexShrink: 1 }}><Text numberOfLines={1} style={styles.playerName}>{opponent ? computerLevel(config.elo).name : computer ? 'You' : sideName(side)}</Text>{computer && <Text numberOfLines={1} style={styles.playerDetail}>{opponent ? `~${config.elo}` : sideName(side)}</Text>}</View>
        <Text style={styles.pieceCount}>{sideMat.total}</Text>
        {sideMat.kings > 0 && <Text style={styles.kingBadge}>♔{sideMat.kings}</Text>}
        {sideMat.advantage > 0 && <Text style={styles.advBadge}>+{sideMat.advantage}</Text>}
        {!analysis && clocks && (config.timeControl ?? 0) > 0 ? <Text style={[styles.clockBadge, isTurn && styles.activeClock]}>{formatClock(clocks[side])}</Text> : <View style={{ marginLeft: 'auto' }} />}
        {isTurn && <View style={styles.turnDot} />}
      </View>;
    })}</View>}
    <Board position={preview} width={boardWidth} flipped={flipped} selected={prefix[prefix.length - 1] ?? null} destinations={destinations} lastMove={node.move} onSquare={onSquare} disabled={!canMove && !editing} path={prefix} hint={hint} />
    {analysis && !editing && <AnalysisLines tree={tree} mainLine={activeAnalysis?.mainLine} selectLine={selectLine} flip={() => setFlipped(!flipped)} share={showPosition} width={analysisWidth} />}
    {analysis && !editing && <ComputerAnalysis analysis={computerAnalysis} navigate={navigateMainLine} width={analysisWidth} />}
    {(!analysis || editing) && <View accessibilityLiveRegion="polite" style={[styles.status, { width: barWidth }]}>
      {busy ? <ActivityIndicator color={C.green} size="small" /> : <View style={styles.turnDot} />}
      <Body numberOfLines={2} style={{ fontSize: 12, lineHeight: 17, flex: 1 }}>{status}</Body>
      {!atLive && !analysis && <Pressable accessibilityRole="button" accessibilityLabel="Return to live game" onPress={toEnd} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: 'DM_700', fontSize: 12, color: C.green }}>Resume</Text></Pressable>}
      {!analysis && completedGame && <Pressable accessibilityRole="button" accessibilityLabel="View game result" onPress={() => setDismissedResultId(null)} style={styles.resultPill}>
        <Text style={styles.resultLabel}>{completedGame.ratingAfter !== undefined ? `${completedGame.ratingAfter} Elo` : 'Game over'}</Text>
        <Text style={styles.playerDetail}>{completedGame.ratingChange !== undefined ? `${completedGame.ratingChange >= 0 ? '+' : ''}${completedGame.ratingChange} · Next steps` : 'Next steps'}</Text>
      </Pressable>}
    </View>}
  </View>;
  const controls = editing && editPosition ? <View style={styles.controls}>
    <View style={styles.actionRow}>{(['white', 'black'] as const).flatMap(side => [false, true].map(king => <Pressable key={side + king} accessibilityRole="button" accessibilityLabel={`Place ${sideName(side)} ${king ? 'king' : 'man'}`} accessibilityState={{ selected: brush?.side === side && brush.king === king }} onPress={() => setBrush({ side, king })} style={[styles.brush, brush?.side === side && brush.king === king && styles.activePlayer]}><Disc piece={{ side, king }} size={27} /><Text style={styles.brushName}>{king ? 'King' : 'Man'}</Text></Pressable>))}<Action icon={Eraser} title="Erase" label="Erase piece" active={brush === null} onPress={() => setBrush(null)} /></View>
    <View style={[s.row, { gap: 8 }]}><Label>To move</Label>{(['white', 'black'] as const).map(side => <Pill key={side} selected={editPosition.turn === side} onPress={() => setEditPosition({ ...editPosition, turn: side })}>{sideName(side)}</Pill>)}<Action compact icon={RotateCcw} title="Clear" label="Clear board" onPress={() => setEditPosition({ ...editPosition, board: Array(rules.size ** 2).fill(null) })} /></View>
    <Button icon={Check} onPress={finishEditor}>Use position</Button>
  </View> : <View style={styles.controls}>
    {analysis && navigation}
    <View style={styles.actionRow}>
      {analysis ? <><Action icon={Cpu} title="Engine" onPress={() => setPanel('engine')} /><Action icon={ListOrdered} title={`Moves · ${moveCount}`} label="Move history" onPress={() => setPanel('moves')} /><Action icon={Pencil} title="Editor" label="Set up position" onPress={startEditor} /><Action icon={Upload} title="Import" label="Import or export position" onPress={showPosition} /></> : <><Action icon={RotateCcw} title="Undo" label="Take back move" disabled={node.parent === null || Boolean(finish || gameResult)} onPress={undo} /><Action icon={Lightbulb} title={hintRequested ? 'Thinking…' : 'Hint'} label="Get a hint" disabled={!canMove || hintRequested} onPress={() => setHintRequested(true)} /><Action icon={ChartNoAxesCombined} title="Analyze" label="Analyze game" onPress={analyze} /><Action icon={ListOrdered} title={`Moves · ${moveCount}`} label="Move history" onPress={() => setPanel('moves')} /></>}
    </View>
    {!analysis && <View style={styles.actionRow}><Action compact icon={FlipVertical2} title="Flip board" active={flipped} onPress={() => setFlipped(!flipped)} /><Action compact icon={Share2} title="Share" label="Share game and position" onPress={showPosition} /><Action compact danger icon={Flag} title="Resign" label="Resign game" disabled={Boolean(finish || gameResult)} onPress={() => setDialog('resign')} /></View>}
    {wide && viewport.height > 600 && <View style={{ marginTop: 8 }}><MoveHistory tree={tree} navigate={navigate} analysis={analysis} /></View>}
  </View>;

  return <View testID="game-workspace" style={{ flex: 1, minHeight: 0 }} onLayout={event => { const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout; setViewport(previous => previous.width === nextWidth && previous.height === nextHeight ? previous : { width: nextWidth, height: nextHeight }); }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.workspace, { minHeight: viewport.height, flexDirection: analysis ? 'column' : wide ? 'row' : 'column' }]}>
        {analysis ? <>{context}<View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: 6 }}>{boardArea}{wide ? <View style={styles.sideTools}>{controls}</View> : controls}</View></> : wide ? <>{boardArea}<View style={styles.sideTools}>{context}{controls}</View></> : <>{context}{boardArea}{controls}</>}
      </View>
      {storageError && <Body style={{ color: '#AE4E3D', padding: 12 }}>Storage is unavailable. This session will not be saved.</Body>}
    </ScrollView>
    {!!toast && <AnimatedToast key={toast} message={toast} />}
    {!analysis && focused && !donationVisible && completedGame && dismissedResultId !== completedGame.id && !setupOpen && !panel && !dialog && <GameResultSheet
      entry={completedGame}
      rating={ratings[completedGame.variant]}
      close={closeResult}
      analyze={analyze}
      history={() => { closeResult(); router.navigate({ pathname: '/history', params: { variant: completedGame.variant, mode: completedGame.mode } }); }}
      puzzles={() => { closeResult(); router.navigate('/puzzles'); }}
      rematch={() => { closeResult(); startGame(config); play('start'); }}
      newGame={() => { closeResult(); setSetupOpen(true); }}
    />}
    {setupOpen && <GameSetupSheet config={config} close={() => setSetupOpen(false)} start={next => { startGame(next); play('start'); setFlipped(next.side === 'black'); setSetupOpen(false); }} />}
    {panel === 'engine' && <Sheet title="Engine analysis" subtitle="Tap a candidate move to play it on the board." onClose={closePanel}><EnginePanel position={position} result={engine} busy={busy} enabled={engineEnabled} toggle={() => setEngineEnabled(!engineEnabled)} playLine={move => { commit(move); closePanel(); }} /><EvaluationGraph tree={tree} navigate={id => { navigate(id); closePanel(); }} /><Body style={{ fontSize: 12, color: C.muted }}>Positive scores favor Ivory. +1.00 is approximately one man. The graph shows static material and position; candidates use deeper search.</Body></Sheet>}
    {panel === 'moves' && <Sheet title="Move history" subtitle={analysis ? 'Review a move, then play another to create a variation.' : 'Tap a move to review its position.'} onClose={closePanel} footer={<>{navigation}{!analysis && <Button onPress={() => { toEnd(); closePanel(); }}>Return to game</Button>}</>}><MoveHistory tree={tree} navigate={id => { navigate(id); closePanel(); }} analysis={analysis} /><EvaluationGraph tree={tree} navigate={id => { navigate(id); closePanel(); }} />{!moveCount && <Body style={{ color: C.muted }}>Select a piece and a highlighted destination to make your first move.</Body>}</Sheet>}
    {panel === 'new-analysis' && <NewAnalysisSheet close={closePanel} importGame={() => { closePanel(); showPosition(); }} />}
    {dialog === 'position' && <Sheet title={analysis ? 'Import & share' : 'Share game'} subtitle={`${rules.name} · FEN position and PDN game notation`} tall onClose={() => setDialog(null)} footer={analysis ? <Button icon={Upload} onPress={usePosition}>Load position</Button> : undefined}>
      <Label>Position (FEN or PDN)</Label><Body style={{ fontSize: 12, color: C.muted }}>W = Ivory, B = Coral, K = king. {analysis ? 'Paste a FEN position or PDN game below to start a new analysis.' : 'Copy this position to open it on an analysis board.'}</Body>
      <TextInput accessibilityLabel="Draughts FEN position" multiline value={fen} onChangeText={setFen} autoCapitalize="characters" autoCorrect={false} style={styles.fen} />
      {!!fenError && <View accessibilityLiveRegion="polite"><Body style={{ color: '#AE4E3D' }}>{fenError}</Body></View>}
      <Button secondary icon={Copy} onPress={async () => { try { await Clipboard.setStringAsync(fen); notify('Position copied.'); } catch { setFenError('Clipboard unavailable. Select and copy the position text.'); } }}>Copy FEN</Button>
      <Label style={{ marginTop: 10 }}>Game (PDN)</Label><Body style={{ fontSize: 12, color: C.muted }}>Copy or share this line with coordinate moves such as c3-d4 and c3xe5.</Body>
      <Button secondary icon={Share2} onPress={async () => { try { await Clipboard.setStringAsync(exportPdn(ancestors(tree))); notify('Game copied as PDN.'); } catch { setFenError('Clipboard unavailable on this device.'); } }}>Copy game as PDN</Button>
      {Platform.OS !== 'web' && <Button icon={Share2} onPress={async () => { try { await Share.share({ title: 'OpenCheckers game', message: exportPdn(ancestors(tree)) }); } catch { setFenError('Could not open sharing. You can copy the game instead.'); } }}>Share game</Button>}
    </Sheet>}
    {dialog === 'resign' && <Sheet title="Resign game?" subtitle="Your opponent will win this game." onClose={() => setDialog(null)} footer={<View style={styles.actionRow}><Button secondary onPress={() => setDialog(null)} style={{ flex: 1 }}>Cancel</Button><Button onPress={() => { setGameResult(`${sideName(config.mode === 'computer' ? opposite(config.side) : opposite(position.turn))} wins by resignation`); play('finish'); setDialog(null); }} style={{ flex: 1 }}>Resign</Button></View>}><Body>You can still review or analyze the game afterward.</Body></Sheet>}
  </View>;
}
const styles = StyleSheet.create({
  workspace: { padding: 12, gap: 6 },
  context: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8, backgroundColor: C.paper, paddingHorizontal: 10, borderRadius: 12 },
  contextButton: { minHeight: 44, paddingHorizontal: 12 },
  analysisHeader: { minHeight: 52, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderRadius: 12 },
  liveScore: { minHeight: 48, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  evaluation: { fontFamily: 'DM_700', fontSize: 20, color: C.green, fontVariant: ['tabular-nums'] },
  evaluationNote: { fontFamily: 'DM_400', fontSize: 10, color: C.muted },
  variant: { fontFamily: 'DM_700', fontSize: 17, color: C.ink },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  players: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  player: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 9, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  activePlayer: { backgroundColor: C.pale, borderColor: '#B8CAAC' },
  playerName: { fontFamily: 'DM_600', fontSize: 12, color: C.ink, flexShrink: 1 },
  playerDetail: { fontFamily: 'DM_500', fontSize: 10, lineHeight: 14, color: C.muted },
  pieceCount: { fontFamily: 'DM_600', fontSize: 11, color: C.muted },
  kingBadge: { fontFamily: 'DM_600', fontSize: 10, color: C.green },
  advBadge: { fontFamily: 'DM_700', fontSize: 10, color: C.green, backgroundColor: '#DCE8D4', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  clockBadge: { fontFamily: 'DM_700', fontSize: 11, color: C.muted, marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  activeClock: { color: C.green },
  turnDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: C.green },
  status: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 10 },
  resultPill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  resultLabel: { fontFamily: 'DM_700', fontSize: 12, color: C.green },
  controls: { gap: 6, backgroundColor: C.paper, borderRadius: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  navigation: { minHeight: 44, flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 12 },
  sideTools: { width: 314, gap: 16 },
  brush: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  brushName: { fontFamily: 'DM_500', fontSize: 11, color: C.ink },
  variantOption: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.paper, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.line },
  fen: { fontFamily: 'DM_500', backgroundColor: C.paper, borderWidth: 1, borderColor: '#B5C6AC', borderRadius: 12, padding: 16, minHeight: 120, fontSize: 15, lineHeight: 23, color: C.ink, textAlignVertical: 'top' },
});
