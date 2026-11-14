import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMove, legalMoves, outcome, type Position } from '../src/game/engine.ts';
import { PUZZLES, getPuzzlePosition, moveRoute, puzzleLine, type SolutionNode } from '../src/game/puzzles.ts';
import pack from '../src/game/puzzlePack.ts';
import { VARIANTS } from '../src/game/variants.ts';

test('All 37 puzzles have unique IDs, source credits, and nonempty level selections', () => {
  assert.equal(PUZZLES.length, 37);
  assert.equal(pack.length, 33);
  assert.equal(new Set(PUZZLES.map(p => p.id)).size, PUZZLES.length);
  for (const level of [1, 2, 3, 4, 5]) assert.ok(PUZZLES.some(puzzle => puzzle.level === level));
  for (const puzzle of PUZZLES) {
    assert.ok(puzzle.hint && puzzle.explanation && puzzle.source.name && puzzle.source.license);
    assert.ok(puzzleLine(puzzle).length >= 2);
  }
});
test('Every imported solution branch and automatic reply is legal and reaches its actual goal', () => {
  for (const item of pack) {
    const puzzle = PUZZLES.find(puzzle => puzzle.id === `shadow-${item.id}`)!;
    const start = getPuzzlePosition(puzzle);
    const size = VARIANTS[puzzle.variant].size;
    const balance = (position: Position) => position.board.reduce((sum, piece) => sum + (!piece ? 0 : (piece.side === start.turn ? 1 : -1) * (piece.king ? puzzle.variant === 'english' ? 1.5 : 2.5 : 1)), 0);
    const visit = (position: Position, node: SolutionNode, ply: number) => {
      assert.equal(position.turn, start.turn);
      assert.ok(Object.keys(node).length, `${item.id}: empty player node`);
      for (const [route, branch] of Object.entries(node)) {
        assert.ok(ply < item.plies, `${item.id}: solution exceeds its move budget`);
        const move = legalMoves(position).find(move => moveRoute(move, size) === route);
        assert.ok(move, `${item.id}: illegal route ${route}`);
        const after = applyMove(position, move);
        if (branch.reply) {
          const reply = legalMoves(after).find(move => moveRoute(move, size) === branch.reply);
          assert.ok(reply, `${item.id}: illegal automatic reply`);
          assert.ok(branch.next);
          visit(applyMove(after, reply), branch.next, ply + 2);
        } else if (item.goal === 'win') assert.equal(outcome(after)?.winner, start.turn, item.id);
        else {
          assert.ok(!legalMoves(after)[0]?.captures.length, `${item.id}: opponent can recapture`);
          assert.ok(balance(after) - balance(start) >= item.gain, `${item.id}: material objective not achieved`);
        }
      }
    };
    visit(start, item.solution, 0);
  }
});
