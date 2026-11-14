import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { computerLevel } from '../game/variants';

const palettes = {
  Pip: { background: '#F5E4C6', shell: '#E4B468', ink: '#694B25' },
  Cleo: { background: '#F7DDD5', shell: '#D78C77', ink: '#653E3C' },
  Jasper: { background: '#DFEAD7', shell: '#91AE7D', ink: '#304D37' },
  Vera: { background: '#E8E0F3', shell: '#AB92C5', ink: '#514066' },
  Orion: { background: '#DCE8F3', shell: '#83A6C4', ink: '#304E69' },
  Atlas: { background: '#EDE5CE', shell: '#BAA16A', ink: '#55472D' },
} as const;

/** Small, offline vector portraits shared by the picker, board, and results. */
export const OpponentAvatar = memo(function OpponentAvatar({ elo, size = 40 }: { elo: number; size?: number }) {
  const { name } = computerLevel(elo);
  const { background, shell, ink } = palettes[name];
  return <View accessible accessibilityRole="image" accessibilityLabel={`${name} AI avatar`} style={{ width: size, height: size, flexShrink: 0 }}>
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Circle cx={32} cy={32} r={32} fill={background} />
      <Path d="M12 64C13 47 51 47 52 64" fill={shell} />
      <Path d="M22 55L32 61L42 55" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <Rect x={10} y={27} width={7} height={15} rx={3} fill={ink} />
      <Rect x={47} y={27} width={7} height={15} rx={3} fill={ink} />
      <Rect x={15} y={17} width={34} height={34} rx={name === 'Vera' ? 10 : name === 'Atlas' ? 8 : 15} fill={shell} stroke={ink} strokeWidth={2} />
      <Rect x={19} y={26} width={26} height={18} rx={8} fill="#FFF9EC" />
      {name === 'Pip' && <><Path d="M32 17V10" stroke={ink} strokeWidth={2} /><Circle cx={32} cy={8} r={4} fill={shell} stroke={ink} strokeWidth={2} /></>}
      {name === 'Cleo' && <><Path d="M11 29C11 8 53 8 53 29" fill="none" stroke={ink} strokeWidth={4} /><Rect x={8} y={27} width={8} height={16} rx={4} fill={shell} /><Rect x={48} y={27} width={8} height={16} rx={4} fill={shell} /></>}
      {name === 'Jasper' && <><Path d="M14 23C14 7 48 7 50 23Z" fill={ink} /><Path d="M25 23H53" stroke={ink} strokeWidth={4} strokeLinecap="round" /><Circle cx={32} cy={16} r={2} fill={background} /></>}
      {name === 'Vera' && <><Path d="M19 30H45" stroke={ink} strokeWidth={2} /><Rect x={20} y={28} width={10} height={9} rx={3} fill={background} stroke={ink} strokeWidth={2} /><Rect x={34} y={28} width={10} height={9} rx={3} fill={background} stroke={ink} strokeWidth={2} /></>}
      {name === 'Orion' && <><Rect x={18} y={27} width={28} height={11} rx={5} fill={ink} /><Path d="M24 32H28M36 32H40" stroke={background} strokeWidth={2} strokeLinecap="round" /><Path d="M32 9L33.5 13.5L38 15L33.5 16.5L32 21L30.5 16.5L26 15L30.5 13.5Z" fill={ink} /></>}
      {name === 'Atlas' && <><Path d="M20 20L17 9L26 14L32 6L38 14L47 9L44 20Z" fill={shell} stroke={ink} strokeWidth={2} strokeLinejoin="round" /><Path d="M21 23H43" stroke={ink} strokeWidth={3} strokeLinecap="round" /></>}
      {name !== 'Orion' && <><Circle cx={25} cy={32} r={2} fill={ink} /><Circle cx={39} cy={32} r={2} fill={ink} /></>}
      <Path d={name === 'Pip' || name === 'Cleo' ? 'M27 39Q32 44 37 39' : 'M28 40Q32 42 36 40'} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  </View>;
});
