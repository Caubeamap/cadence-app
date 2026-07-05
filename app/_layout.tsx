import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Lora_700Bold, useFonts } from '@expo-google-fonts/lora';
import * as SplashScreen from 'expo-splash-screen';
import { ensureNotificationPermission, onNotificationReceived } from '../src/services/notifications';
import { speakVietnamese } from '../src/services/tts';
import { useDayStore } from '../src/stores/useDayStore';
import { useSettingsStore } from '../src/stores/useSettingsStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lora_700Bold });

  useEffect(() => {
    useSettingsStore.getState().hydrate();
    useDayStore.getState().load();
    void ensureNotificationPermission();

    const offNotification = onNotificationReceived((body) => {
      const { voiceEnabled, speechRate } = useSettingsStore.getState();
      if (voiceEnabled) void speakVietnamese(body, speechRate);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') useDayStore.getState().load();
    });
    return () => {
      offNotification();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = { root: { flex: 1 } };
