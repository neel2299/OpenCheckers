import React, { memo, useId, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Image as SvgImage, Line, Path, Pattern, Rect } from 'react-native-svg';
import { useGame } from '../state/GameContext';
import { useMediaUri } from './AssetsProvider';
import { THEMES, type BoardPalette, type Texture } from './model';

export function contrastText(color: string): string {
  const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.3 ? '#20382D' : '#FFFFFF';
}

function TexturePattern({ id, texture, uri }: { id: string; texture: Texture; uri?: string | null }) {
  return <Pattern id={id} patternUnits="userSpaceOnUse" width={uri ? 96 : 48} height={uri ? 96 : 48}>
    {uri ? <SvgImage href={{ uri }} width={96} height={96} preserveAspectRatio="xMidYMid slice" /> : texture === 'wood' ? <>
      <Path d="M-8 7C8 0 31 16 58 5M-8 22C15 10 27 32 58 19M-8 38C14 26 27 48 58 35" fill="none" stroke="#34261C" strokeWidth={2} opacity={0.35} />
      <Path d="M-8 12C8 5 31 21 58 10M-8 43C14 31 27 53 58 40" fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.45} />
    </> : texture === 'linen' ? <>
      {[4, 12, 20, 28, 36, 44].map(n => <React.Fragment key={n}><Line x1={n} y1={0} x2={n} y2={48} stroke="#FFFFFF" strokeWidth={1} opacity={0.65} /><Line x1={0} y1={n} x2={48} y2={n} stroke="#20382D" strokeWidth={1} opacity={0.35} /></React.Fragment>)}
    </> : texture === 'marble' ? <>
      <Path d="M-8 0C37 7 6 25 55 48M-6 21C18 16 20 44 52 38" fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.7} />
      <Path d="M-8 3C37 10 6 28 55 51" fill="none" stroke="#20382D" strokeWidth={1} opacity={0.3} />
    </> : texture === 'dots' ? <><Circle cx={8} cy={8} r={2} fill="#20382D" opacity={0.35} /><Circle cx={32} cy={32} r={2} fill="#FFFFFF" opacity={0.6} /></> : texture === 'royal' ? <>
      <Path d="M24 3L45 24L24 45L3 24Z M24 13L35 24L24 35L13 24Z" fill="none" stroke="#D7B76D" strokeWidth={1.3} opacity={0.8} />
      <Circle cx={0} cy={0} r={2.5} fill="#F5D997" /><Circle cx={48} cy={48} r={2.5} fill="#F5D997" />
    </> : null}
  </Pattern>;
}

export const TextureLayer = memo(function TextureLayer({ texture, uri, opacity = 0.35 }: { texture: Texture; uri?: string | null; opacity?: number }) {
  const id = `surface${useId().replace(/[^a-z0-9]/gi, '')}`;
  if (texture === 'none' && !uri) return null;
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%"><Defs><TexturePattern id={id} texture={texture} uri={uri} /></Defs><Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} /></Svg>
  </View>;
});

export function AppBackground() {
  const { preferences } = useGame();
  const background = preferences.personalization.background;
  const uri = useMediaUri(background.image);
  return <View pointerEvents="none" testID="personalized-background" style={[StyleSheet.absoluteFill, { backgroundColor: background.color }]}>
    {uri && <Image testID="custom-background-image" accessible={false} source={{ uri }} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: background.imageOpacity }]} />}
    <TextureLayer texture={background.texture} opacity={0.2} />
  </View>;
}

export const BoardSurfaceLayer = memo(function BoardSurfaceLayer({ size, tile, palette }: { size: number; tile: number; palette: BoardPalette }) {
  const { preferences } = useGame();
  const board = preferences.personalization.board;
  const darkUri = useMediaUri(board.images.dark), lightUri = useMediaUri(board.images.light);
  const id = `board${useId().replace(/[^a-z0-9]/gi, '')}`;
  const paths = useMemo(() => {
    const dark: string[] = [], light: string[] = [];
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      const rectangle = `M${col * tile} ${row * tile}h${tile}v${tile}h-${tile}Z`;
      ((row + col) % 2 ? dark : light).push(rectangle);
    }
    return { dark: dark.join(''), light: light.join('') };
  }, [size, tile]);
  return <View pointerEvents="none" accessible={false} testID="board-surface" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%">
      <Defs><TexturePattern id={`${id}dark`} texture={board.texture} uri={darkUri} /><TexturePattern id={`${id}light`} texture={board.texture} uri={lightUri} /></Defs>
      <Rect width="100%" height="100%" fill={palette.light} /><Path d={paths.dark} fill={palette.dark} />
      {(darkUri || board.texture !== 'none') && <Path testID={darkUri ? 'custom-dark-texture' : undefined} d={paths.dark} fill={`url(#${id}dark)`} opacity={board.textureOpacity} />}
      {(lightUri || board.texture !== 'none') && <Path testID={lightUri ? 'custom-light-texture' : undefined} d={paths.light} fill={`url(#${id}light)`} opacity={board.textureOpacity} />}
    </Svg>
  </View>;
});

export function useBoardPalette(): BoardPalette {
  const { preferences } = useGame();
  return preferences.personalization.board.palette ?? THEMES[preferences.theme] ?? THEMES.sage;
}
