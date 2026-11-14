import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeGameLine, analysisKeys } from '../game/analysis';
import { canSaveAnalysis, mainLineIds } from '../game/savedAnalysis';
import { useGame, type Tree } from '../state/GameContext';

export function useComputerAnalysis(tree: Tree, enabled: boolean) {
  const { activeAnalysis, requestGameAnalysis, pauseGameAnalysis, resumeGameAnalysis, saveAnalysisPoint } = useGame();
  const source = activeAnalysis?.tree ?? tree;
  const { nodes } = source;
  const fallback = useMemo(() => mainLineIds({ nodes, current: 0 }), [nodes]);
  const ids = activeAnalysis?.mainLine ?? source.gameSource?.mainLine ?? fallback;
  const line = useMemo(() => ids.map(id => nodes[id]), [ids, nodes]);
  const keys = useMemo(() => analysisKeys(line), [line]);
  const id = activeAnalysis?.id ?? '';
  const cache = activeAnalysis?.cache;
  const points = line.map((node, index) => cache?.points[node.id]?.key === keys[index] ? cache.points[node.id] : undefined);
  const completed = points.filter(Boolean).length;
  const hasMoves = canSaveAnalysis(tree);
  const complete = Boolean(activeAnalysis) && completed === line.length;
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const error = failure?.id === id ? failure.message : null;
  const running = activeAnalysis?.status === 'running' && enabled && !complete && !error;
  const latest = useRef({ line, cache });
  useEffect(() => { latest.current = { line, cache }; }, [line, cache]);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    const job = latest.current;
    void analyzeGameLine(job.line, job.cache, {
      signal: controller.signal,
      onResult: (nodeId, point) => { if (!controller.signal.aborted) saveAnalysisPoint(id, nodeId, point); },
    }).catch(reason => {
      if (!controller.signal.aborted) {
        pauseGameAnalysis(id);
        setFailure({ id, message: reason instanceof Error ? reason.message : 'Analysis interrupted. Resume to try again.' });
      }
    });
    return () => controller.abort();
  }, [running, id, saveAnalysisPoint, pauseGameAnalysis]);

  const start = () => {
    setFailure(null);
    if (activeAnalysis && !complete) resumeGameAnalysis(id);
    else requestGameAnalysis();
  };
  const stop = () => { if (id) pauseGameAnalysis(id); };
  const currentIndex = ids.indexOf(tree.current);
  let cursor = tree.nodes[tree.current];
  while (cursor && !ids.includes(cursor.id) && cursor.parent !== null) cursor = tree.nodes[cursor.parent];
  const selectedIndex = Math.max(0, ids.indexOf(cursor?.id));
  return { line, points, completed, hasMoves, complete, running, error, start, stop, hasRequest: Boolean(activeAnalysis), offMainLine: currentIndex < 0, selectedIndex, currentPoint: currentIndex < 0 ? undefined : points[currentIndex] };
}
