import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PuzzleScreen } from '../components/PuzzleScreen';
import { Body, Button, Card } from '../components/ui';
import { PUZZLES } from '../game/puzzles';

export default function PuzzlePage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const puzzle = PUZZLES.find(puzzle => puzzle.id === id);
  if (!puzzle) return <Card><Body>This puzzle could not be found.</Body><Button onPress={() => router.replace('/puzzles')}>Browse puzzles</Button></Card>;
  return <PuzzleScreen key={puzzle.id} puzzle={puzzle} />;
}
