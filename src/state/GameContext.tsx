import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyMove, createPosition, outcome, type Move, type Position } from '../game/engine';
import { exportPdn, importPdn } from '../game/pdn';
import { VARIANTS, computerLevel, type Side, type VariantId } from '../game/variants';
import { DEFAULT_PREFERENCES, restorePreferences, type Preferences } from './preferences';
import { appendResult, initialRecord, restoreRecord, type CompletedGame, type PlayerStats, type Ratings } from '../game/records';
import { analysisKeys, displayLine, type GameEvaluation } from '../game/analysis';
import { activeSavedAnalysis, currentStudy, fullGameStudy, mainLineIds, requestSavedAnalysis, restoreAnalysisWorkspace, selectSavedAnalysis, setAnalysisRunning, startStudy, stripLegacyAnalysis, updateSavedEvaluation, updateStudy, type AnalysisWorkspace, type SavedAnalysis, type StudyTree } from '../game/savedAnalysis';
export type { CompletedGame, PlayerStats } from '../game/records';
export { DEFAULT_STATS } from '../game/records';

export interface GameConfig { variant: VariantId; elo: number; mode: 'computer' | 'friend'; side: Side; timeControl?: number }
export interface Node { id: number; parent: number | null; children: number[]; position: Position; move: Move | null }
export interface Tree extends StudyTree { nodes: Node[] }
const initialConfig: GameConfig = { variant: 'english', elo: 1200, mode: 'computer', side: 'black', timeControl: 0 };
export const newTree = (position: Position): Tree => ({ nodes: [{ id: 0, parent: null, children: [], position, move: null }], current: 0 });
export function treeFromLine(line: { position: Position; move: Move | null }[]): Tree {
  if (!line.length) return newTree(createPosition());
  const nodes: Node[] = line.map((item, idx) => ({
    id: idx,
    parent: idx === 0 ? null : idx - 1,
    children: idx + 1 < line.length ? [idx + 1] : [],
    position: item.position,
    move: item.move,
  }));
  return { nodes, current: nodes.length - 1 };
}
export function ancestors(tree: Tree): Node[] {
  const path: Node[] = []; let node: Node | undefined = tree.nodes[tree.current];
  while (node) { path.unshift(node); node = node.parent === null ? undefined : tree.nodes[node.parent]; }
  return path;
}
export function addMove(tree: Tree, move: Move): Tree {
  const current = tree.nodes[tree.current];
  const existing = current.children.find(id => tree.nodes[id].move?.id === move.id);
  if (existing !== undefined) return { ...tree, current: existing, reviewLeaf: displayLine({ ...tree, current: existing, reviewLeaf: undefined }).at(-1)?.id ?? existing };
  const id = tree.nodes.length;
  const nodes = tree.nodes.map(n => n.id === current.id ? { ...n, children: [...n.children, id] } : n);
  nodes.push({ id, parent: current.id, children: [], position: applyMove(current.position, move), move });
  return { ...tree, nodes, current: id, reviewLeaf: id };
}
interface Context {
  config: GameConfig; setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
  game: Tree; setGame: React.Dispatch<React.SetStateAction<Tree>>;
  study: Tree; setStudy: React.Dispatch<React.SetStateAction<Tree>>;
  savedAnalyses: SavedAnalysis[]; activeAnalysis: SavedAnalysis | null;
  newStudy: (tree: Tree) => void; selectAnalysis: (id: string) => void;
  requestGameAnalysis: () => void; pauseGameAnalysis: (id: string) => void; resumeGameAnalysis: (id: string) => void;
  saveAnalysisPoint: (id: string, nodeId: number, point: GameEvaluation) => void;
  preferences: Preferences; setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  clocks: { white: number; black: number } | null; setClocks: React.Dispatch<React.SetStateAction<{ white: number; black: number } | null>>;
  stats: PlayerStats; archive: CompletedGame[]; ratings: Ratings; completedGame: CompletedGame | null;
  solvedPuzzles: string[]; markPuzzleSolved: (id: string) => void;
  tutorialSeenCount: number; tutorialOpen: boolean; openTutorial: () => void; closeTutorial: () => void;
  recordGameOutcome: (winner: Side | null, reason: string) => void;
  loadArchivedGame: (entry: CompletedGame) => void;
  ready: boolean; storageError: boolean; result: string | null; setResult: (result: string | null) => void;
  flushStorage: () => Promise<void>;
  startGame: (config: GameConfig) => void; analyzeGame: () => void;
}
const GameContext = createContext<Context | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(initialConfig);
  const [game, setGame] = useState(() => newTree(createPosition()));
  const [analysisWorkspace, setAnalysisWorkspace] = useState<AnalysisWorkspace>(() => ({ draft: newTree(createPosition()), items: [], activeId: null }));
  const study = currentStudy(analysisWorkspace);
  const activeAnalysis = activeSavedAnalysis(analysisWorkspace);
  const savedAnalyses = analysisWorkspace.items;
  const setStudy = useCallback<React.Dispatch<React.SetStateAction<Tree>>>(update => setAnalysisWorkspace(current => updateStudy(current, update)), []);
  const newStudy = useCallback((tree: Tree) => setAnalysisWorkspace(current => startStudy(current, tree)), []);
  const selectAnalysis = useCallback((id: string) => setAnalysisWorkspace(current => selectSavedAnalysis(current, id)), []);
  const requestSerial = useRef(0);
  const requestGameAnalysis = useCallback(() => {
    const id = `analysis-${Date.now()}-${++requestSerial.current}`;
    const requestedAt = new Date().toISOString();
    setAnalysisWorkspace(current => requestSavedAnalysis(current, id, requestedAt));
  }, []);
  const pauseGameAnalysis = useCallback((id: string) => setAnalysisWorkspace(current => setAnalysisRunning(current, id, false)), []);
  const resumeGameAnalysis = useCallback((id: string) => setAnalysisWorkspace(current => setAnalysisRunning(current, id, true)), []);
  const saveAnalysisPoint = useCallback((id: string, nodeId: number, point: GameEvaluation) => setAnalysisWorkspace(current => updateSavedEvaluation(current, id, nodeId, point)), []);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [clocks, setClocks] = useState<{ white: number; black: number } | null>(null);
  const [record, setRecord] = useState(initialRecord);
  const { stats, archive, ratings } = record;
  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>([]);
  const [tutorialSeenCount, setTutorialSeenCount] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const recordedRef = useRef(false);
  const [gameId, setGameId] = useState('');
  const persistedIds = useRef(new Set<string>());
  const persistedAnalyses = useRef(new Map<string, SavedAnalysis>());
  const pendingSave = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const completedGame = recorded ? archive.find(entry => entry.id === gameId) ?? null : null;
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('draughts-club-v1'),
      AsyncStorage.getItem('draughts-club-tutorial-count'),
    ]).then(async ([raw, rawCount]) => {
      setGameId(`game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      const prevTutorialCount = rawCount ? Number(rawCount) || 0 : 0;
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.version === 1 && saved.game?.nodes?.length && saved.game.nodes[saved.game.current] && saved.config && saved.preferences) {
          if (Array.isArray(saved.archiveIds)) {
            const stored = await AsyncStorage.multiGet(saved.archiveIds.map((id: string) => `draughts-club-history-${id}`));
            saved.archive = stored.flatMap(([, json]) => {
              if (!json) { setStorageError(true); return []; }
              try { return [JSON.parse(json)]; } catch { setStorageError(true); return []; }
            });
            persistedIds.current = new Set(saved.archive.map((entry: CompletedGame) => entry.id));
          }
          setConfig({ timeControl: 0, ...saved.config });
          setGame(saved.game);
          setPreferences(restorePreferences(saved.preferences));
          setResult(saved.result ?? null);
          if (saved.clocks && typeof saved.clocks.white === 'number' && typeof saved.clocks.black === 'number') setClocks(saved.clocks);
          setRecord(restoreRecord(saved));
          if (Array.isArray(saved.solvedPuzzles)) setSolvedPuzzles(saved.solvedPuzzles);
          if (typeof saved.recorded === 'boolean') { setRecorded(saved.recorded); recordedRef.current = saved.recorded; }
          if (typeof saved.gameId === 'string') setGameId(saved.gameId);
          const draft: Tree = saved.study?.nodes?.[saved.study.current] ? stripLegacyAnalysis(saved.study) : newTree(createPosition());
          const analysisItems: unknown[] = [];
          if (Array.isArray(saved.analysisIds)) {
            const stored = await AsyncStorage.multiGet(saved.analysisIds.slice(0, 5).map((id: string) => `opencheckers-analysis-${id}`));
            for (const [, json] of stored) {
              if (!json) { setStorageError(true); continue; }
              try { analysisItems.push(JSON.parse(json)); } catch { setStorageError(true); }
            }
          }
          let restoredActiveId = saved.activeAnalysisId;
          // Preserve an older full-game analysis when it can be matched to a
          // completed game. Position-only caches do not enter the five slots.
          if (!analysisItems.length && saved.study?.computerAnalysis?.version === 1) {
            const ids = mainLineIds(draft);
            const signature = analysisKeys(ids.map(id => draft.nodes[id])).at(-1);
            const entry = (saved.archive ?? []).find((candidate: CompletedGame) => {
              try { return signature === analysisKeys(treeFromLine(importPdn(candidate.pdn, candidate.variant)).nodes).at(-1); } catch { return false; }
            }) as CompletedGame | undefined;
            if (entry && ids.length > 1) {
              const tree = fullGameStudy(draft, 'completed-game', `${VARIANTS[entry.variant].name} · Restored game`);
              const id = `restored-${entry.id}`;
              analysisItems.push({ id, requestedAt: entry.date, title: tree.gameSource!.title, tree, mainLine: ids, cache: saved.study.computerAnalysis, status: 'paused' });
              restoredActiveId = id;
            }
          }
          const restored = restoreAnalysisWorkspace(draft, analysisItems, restoredActiveId);
          setAnalysisWorkspace(restored);
          persistedAnalyses.current = new Map(restored.items.map(item => [item.id, { ...item }]));
        }
      }
      if (prevTutorialCount < 3) {
        const nextCount = prevTutorialCount + 1;
        setTutorialSeenCount(nextCount);
        setTutorialOpen(true);
        void AsyncStorage.setItem('draughts-club-tutorial-count', String(nextCount)).catch(() => {});
      } else {
        setTutorialSeenCount(prevTutorialCount);
      }
    }).catch(() => setStorageError(true)).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify({
      version: 1, config, game, study: analysisWorkspace.draft, analysisIds: analysisWorkspace.items.map(item => item.id), activeAnalysisId: analysisWorkspace.activeId, preferences, result, clocks, stats, archiveIds: archive.map(entry => entry.id), ratings, solvedPuzzles, recorded, gameId,
    });
    // Serialize writes: a slow clock save must never overwrite a later result.
    pendingSave.current = pendingSave.current.catch(() => {}).then(async () => {
      // Keep PDNs in individual records instead of one growing Android storage
      // row. There is no arbitrary 20-game history cutoff.
      const fresh = archive.filter(entry => !persistedIds.current.has(entry.id));
      if (fresh.length) await AsyncStorage.multiSet(fresh.map(entry => [`draughts-club-history-${entry.id}`, JSON.stringify(entry)]));
      const changedAnalyses = analysisWorkspace.items.filter(item => persistedAnalyses.current.get(item.id) !== item);
      if (changedAnalyses.length) await AsyncStorage.multiSet(changedAnalyses.map(item => [`opencheckers-analysis-${item.id}`, JSON.stringify(item)]));
      await AsyncStorage.setItem('draughts-club-v1', serialized);
      const removedAnalyses = [...persistedAnalyses.current.keys()].filter(id => !analysisWorkspace.items.some(item => item.id === id));
      if (removedAnalyses.length) await AsyncStorage.multiRemove(removedAnalyses.map(id => `opencheckers-analysis-${id}`));
      persistedAnalyses.current = new Map(analysisWorkspace.items.map(item => [item.id, item]));
      fresh.forEach(entry => persistedIds.current.add(entry.id));
    }).catch(() => setStorageError(true));
  }, [config, game, analysisWorkspace, preferences, result, clocks, stats, archive, ratings, solvedPuzzles, recorded, gameId, ready]);

  const openTutorial = useCallback(() => setTutorialOpen(true), []);
  const flushStorage = useCallback(() => pendingSave.current, []);
  const closeTutorial = useCallback(() => setTutorialOpen(false), []);

  const startGame = useCallback((next: GameConfig) => {
    const normalized = { timeControl: 0, ...next };
    setConfig(normalized);
    setGame(newTree(createPosition(normalized.variant)));
    setResult(null);
    setRecorded(false);
    recordedRef.current = false;
    setGameId(`game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    setClocks(normalized.timeControl && normalized.timeControl > 0 ? { white: normalized.timeControl * 60, black: normalized.timeControl * 60 } : null);
  }, []);

  const analyzeGame = useCallback(() => {
    const tree: Tree = stripLegacyAnalysis(JSON.parse(JSON.stringify(game)));
    const completed = recorded || Boolean(result) || Boolean(outcome(game.nodes[game.current].position, ancestors(game).map(node => node.position)));
    const title = `${VARIANTS[config.variant].name} · ${config.mode === 'friend' ? 'Two players' : `vs ${computerLevel(config.elo).name}`}`;
    newStudy(completed ? fullGameStudy(tree, 'completed-game', title) : tree);
  }, [game, recorded, result, config.variant, config.mode, config.elo, newStudy]);

  const markPuzzleSolved = useCallback((id: string) => {
    setSolvedPuzzles(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const recordGameOutcome = useCallback((winner: Side | null, reason: string) => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setRecorded(true);
    const line = ancestors(game);
    const moveCount = Math.max(0, line.length - 1);
    const resultToken = winner === 'white' ? '1-0' : winner === 'black' ? '0-1' : '1/2-1/2';
    let pdn = '';
    try { pdn = exportPdn(line, resultToken); } catch { pdn = ''; }
    const entry: CompletedGame = {
      id: gameId,
      date: new Date().toISOString(),
      variant: config.variant,
      mode: config.mode,
      elo: config.elo,
      userSide: config.side,
      winner,
      reason,
      moves: moveCount,
      pdn,
      timeControl: config.timeControl ?? 0,
    };
    setRecord(prev => appendResult(prev, entry));
  }, [game, config, gameId]);

  const loadArchivedGame = useCallback((entry: CompletedGame) => {
    try {
      const line = importPdn(entry.pdn, entry.variant);
      newStudy(fullGameStudy(treeFromLine(line), 'completed-game', `${VARIANTS[entry.variant].name} · ${entry.mode === 'friend' ? 'Two players' : `vs ${entry.opponentName ?? computerLevel(entry.elo).name}`}`));
    } catch {
      newStudy(newTree(createPosition(entry.variant)));
    }
  }, [newStudy]);

  return <GameContext.Provider value={{
    config, setConfig, game, setGame, study, setStudy, preferences, setPreferences,
    savedAnalyses, activeAnalysis, newStudy, selectAnalysis, requestGameAnalysis, pauseGameAnalysis, resumeGameAnalysis, saveAnalysisPoint,
    clocks, setClocks, stats, archive, ratings, completedGame, solvedPuzzles, markPuzzleSolved,
    tutorialSeenCount, tutorialOpen, openTutorial, closeTutorial,
    recordGameOutcome, loadArchivedGame, ready, storageError, flushStorage, result, setResult, startGame, analyzeGame,
  }}>{children}</GameContext.Provider>;
}
export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('GameProvider is required');
  return value;
}
