import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import type { Piece } from '../../game/engine';
import { useGame } from '../../state/GameContext';
import { useMediaUri } from '../../personalization/AssetsProvider';
import { TextureLayer, contrastText } from '../../personalization/Surfaces';

export function Disc({ piece, size, selected = false }: { piece: Piece; size: number; selected?: boolean }) {
  const white = piece.side === 'white';
  const { preferences } = useGame();
  const appearance = preferences.personalization.pieces;
  const color = appearance[piece.side];
  const image = useMediaUri(appearance.images[piece.side]);
  return <View style={[{ alignItems: 'center', justifyContent: 'center', borderWidth: 1.3, width: size, height: size, borderRadius: size, backgroundColor: color, borderColor: white ? '#DED9C9' : '#B9654F', boxShadow: white ? '0px 3px 0px #C8CCB6, 0px 5px 6px rgba(27,47,31,0.2)' : '0px 3px 0px #985441, 0px 5px 6px rgba(27,47,31,0.2)', transform: [{ translateY: -2 }] }, selected && { borderColor: '#F4EDB2', borderWidth: 3 }]}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size, overflow: 'hidden' }]}>{image ? <Image accessible={false} source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <TextureLayer texture={appearance.texture} opacity={0.4} />}</View>
    <View style={{ width: '77%', height: '77%', borderRadius: size, borderWidth: 1, borderColor: white ? '#E0DCCC' : '#E6A48A', alignItems: 'center', justifyContent: 'center', backgroundColor: piece.king ? '#FFFFFF55' : 'transparent' }}>{piece.king ? <Crown size={size * 0.45} strokeWidth={1.8} color={contrastText(color)} /> : <View style={{ width: '83%', height: '83%', borderRadius: size, borderWidth: 1, borderColor: white ? '#EAE6D8' : '#C36F58' }} />}</View>
  </View>;
}
