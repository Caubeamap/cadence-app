import * as Speech from 'expo-speech';

let cachedVoice: Speech.Voice | null | undefined;

async function pickBestVietnameseVoice(): Promise<Speech.Voice | null> {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = await Speech.getAvailableVoicesAsync();
  const vietnamese = voices.filter((v) => v.language.toLowerCase().startsWith('vi'));
  const enhanced = vietnamese.find((v) => v.quality === Speech.VoiceQuality.Enhanced);
  cachedVoice = enhanced ?? vietnamese[0] ?? null;
  return cachedVoice;
}

export async function speakVietnamese(text: string, rate = 1.0): Promise<void> {
  const voice = await pickBestVietnameseVoice();
  Speech.stop();
  Speech.speak(text, {
    language: 'vi-VN',
    rate,
    ...(voice && { voice: voice.identifier }),
  });
}

export async function describeVietnameseVoice(): Promise<string | null> {
  const voice = await pickBestVietnameseVoice();
  if (!voice) return null;
  const quality = voice.quality === Speech.VoiceQuality.Enhanced ? 'bản nâng cao' : 'bản thường';
  return `${voice.name} (${quality})`;
}
