import { useColorScheme } from 'react-native';
import { palette, ThemeColors } from './tokens';

export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
