import type { TextStyle } from 'react-native';

export const palette = {
  light: {
    bg: '#FAF6F0',
    surface: '#FFFFFF',
    ink: '#2B2620',
    inkMuted: '#8D8375',
    hairline: '#E8E0D2',
    accent: '#B4551D',
    accentSoft: '#F5E7D9',
    danger: '#A63D33',
  },
  dark: {
    bg: '#181512',
    surface: '#221E19',
    ink: '#ECE4D8',
    inkMuted: '#988D7E',
    hairline: '#373128',
    accent: '#E08A4E',
    accentSoft: '#33271C',
    danger: '#D96C5B',
  },
};
export type ThemeColors = typeof palette.light;

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };
export const radii = { s: 8, m: 14 };

export const fonts = { display: 'Lora_700Bold' };

const t = (style: TextStyle): TextStyle => style;
export const type = {
  display: t({ fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.3 }),
  section: t({ fontSize: 17, fontWeight: '600' }),
  body: t({ fontSize: 15, fontWeight: '400' }),
  time: t({ fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] }),
  caption: t({ fontSize: 13, fontWeight: '400' }),
};
