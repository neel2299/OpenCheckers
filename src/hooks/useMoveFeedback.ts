import { useEffect, useRef } from 'react';
import { moveCue } from '../feedback/events';
import { useFeedback } from '../feedback/FeedbackProvider';
import { useGame, type Tree } from '../state/GameContext';

/** New moves make sound. Loading saves, editing, and reviewing history stay quiet. */
export function useMoveFeedback(tree: Tree, finished: boolean, victory = false) {
  const { ready } = useGame();
  const { play } = useFeedback();
  const previous = useRef({ tree, ready });
  useEffect(() => {
    const last = previous.current;
    previous.current = { tree, ready };
    const node = tree.nodes[tree.current];
    if (!ready || !last.ready || !node.move || tree.nodes.length <= last.tree.nodes.length || node.parent !== last.tree.current) return;
    const before = last.tree.nodes[last.tree.current].position;
    play(finished ? victory ? 'victory' : 'finish' : moveCue(before, node.move));
  }, [tree, ready, play, finished, victory]);
}
