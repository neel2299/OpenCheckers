import React, { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { coordinate, positionKey, squareNumber, type Move, type Position } from '../game/engine';
import { VARIANTS, sideName } from '../game/variants';
import { useGame } from '../state/GameContext';
import { useMotion } from '../hooks/useMotion';
import { boardTransition, type BoardTransition } from '../game/transition';
import { MoveAnimation } from './board/MoveAnimation';
import { SelectablePiece } from './board/SelectablePiece';
import { BoardSurfaceLayer, TextureLayer, contrastText, useBoardPalette } from '../personalization/Surfaces';
import { useMediaUri } from '../personalization/AssetsProvider';

export { THEMES } from '../personalization/model';
export { Disc } from './board/Disc';
export function Board({ position, width, flipped, selected, destinations, lastMove, onSquare, disabled, path = [], hint }: { position: Position; width: number; flipped: boolean; selected: number | null; destinations: number[]; lastMove?: Move | null; onSquare: (index: number) => void; disabled?: boolean; path?: number[]; hint?: Move | null }) {
  const { preferences } = useGame();
  const { enabled: motion } = useMotion();
  const theme = useBoardPalette();
  const frameUri = useMediaUri(preferences.personalization.board.images.frame);
  const size = VARIANTS[position.variant].size;
  const frame = width < 400 ? 9 : 13;
  const tile = (width - frame * 2) / size;
  const [snapshot, setSnapshot] = useState(position);
  const [animation, setAnimation] = useState<{ id: string; transition: BoardTransition } | null>(null);
  const [geometry, setGeometry] = useState({ width, flipped, motion });
  const key = positionKey(position);
  if (positionKey(snapshot) !== key) {
    setSnapshot(position);
    const transition = motion ? boardTransition(snapshot, position, lastMove, path.length > 1) : null;
    setAnimation(transition ? { id: key, transition } : null);
  }
  if (geometry.width !== width || geometry.flipped !== flipped || geometry.motion !== motion) {
    setGeometry({ width, flipped, motion }); setAnimation(null);
  }
  return <View style={{ width, padding: frame, backgroundColor: theme.frame, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(32,56,45,0.09)', boxShadow: '0px 8px 24px rgba(45,64,43,0.08)' }}>
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden' }}><TextureLayer texture={preferences.personalization.board.texture} uri={frameUri} opacity={preferences.personalization.board.textureOpacity} /></View>
    <View style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
    <BoardSurfaceLayer size={size} tile={tile} palette={theme} />
    {Array.from({ length: size }, (_, displayRow) => <View key={displayRow} style={{ flexDirection: 'row' }}>{Array.from({ length: size }, (_, displayCol) => {
      const row = flipped ? size - 1 - displayRow : displayRow;
      const col = flipped ? size - 1 - displayCol : displayCol;
      const index = row * size + col;
      const dark = (row + col) % 2 === 1;
      const piece = position.board[index];
      const movingDestination = animation?.transition.path.at(-1) === index;
      const isDestination = destinations.includes(index);
      const isLast = lastMove?.from === index || lastMove?.to === index;
      const isLastStep = !isLast && Boolean(lastMove && lastMove.path.length > 2 && lastMove.path.includes(index));
      const isHint = hint?.from === index || hint?.to === index;
      const isHintStep = !isHint && Boolean(hint && hint.path.length > 2 && hint.path.includes(index));
      const isSelected = selected === index || path.includes(index);
      return <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${coordinate(index, size)}${dark ? `, square ${squareNumber(index, size)}` : ''}${piece ? `, ${sideName(piece.side)} ${piece.king ? 'king' : 'man'}` : ', empty'}${isDestination ? ', legal destination' : ''}`} accessibilityState={{ selected: selected === index, disabled: !dark || disabled || Boolean(animation) }} disabled={!dark || disabled || Boolean(animation)} onPress={() => onSquare(index)} style={{ width: tile, height: tile, backgroundColor: isSelected ? '#C0CA8F' : isHint ? '#CAD68F' : isLast ? theme.last : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {preferences.numbers && dark && <Text style={{ position: 'absolute', top: 2, right: 3, fontSize: Math.max(7, tile * 0.16), fontFamily: 'DM_400', color: contrastText(theme.dark), opacity: 0.9 }}>{squareNumber(index, size)}</Text>}
        {(isLastStep || isHintStep) && !piece && !isDestination && <View pointerEvents="none" style={{ width: tile * 0.16, height: tile * 0.16, borderRadius: tile, backgroundColor: isHintStep ? '#DCE8A0' : 'rgba(255,255,255,0.45)' }} />}
        {piece && !movingDestination && <SelectablePiece piece={piece} size={tile * 0.73} selected={selected === index} motion={motion} />}
        {isDestination && preferences.hints && <View style={{ position: 'absolute', width: piece ? tile * 0.83 : tile * 0.25, height: piece ? tile * 0.83 : tile * 0.25, borderRadius: tile, backgroundColor: piece ? 'transparent' : 'rgba(35,69,45,0.38)', borderWidth: piece ? 3 : 2, borderColor: piece ? '#D8E8A6' : 'rgba(235,244,210,0.65)' }} />}
        {displayCol === 0 && <Text pointerEvents="none" style={{ position: 'absolute', left: 3, top: 2, color: contrastText(dark ? theme.dark : theme.light), fontFamily: 'DM_500', fontSize: Math.max(8, tile * 0.17) }}>{size - row}</Text>}
        {displayRow === size - 1 && <Text pointerEvents="none" style={{ position: 'absolute', right: 4, bottom: 1, color: contrastText(dark ? theme.dark : theme.light), fontFamily: 'DM_500', fontSize: Math.max(8, tile * 0.17) }}>{String.fromCharCode(97 + col)}</Text>}
      </Pressable>;
    })}</View>)}
    {animation && <MoveAnimation key={animation.id} transition={animation.transition} size={size} tile={tile} flipped={flipped} onComplete={() => setAnimation(current => current?.id === animation.id ? null : current)} />}
    </View>
  </View>;
}
