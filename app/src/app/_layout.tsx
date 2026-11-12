import { Stack, ThemeProvider, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// importa só os pesos usados (o pacote inteiro levaria todas as fontes ao build)
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProvedorApp } from '@/ui/estado';
import { C, ehWeb } from '@/ui/tema';

const TEMA = { ...DarkTheme, colors: { ...DarkTheme.colors, background: ehWeb ? 'transparent' : C.bg, card: C.bg, primary: C.roxo, text: C.txt, border: C.borda } };

export default function Layout() {
  // as fontas carregam em segundo plano; o app aparece na hora (com a fonte do sistema até lá)
  useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, JetBrainsMono_700Bold });
  return (
    <SafeAreaProvider>
      <ThemeProvider value={TEMA}>
      <ProvedorApp>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, title: 'Tudo-Busca', contentStyle: { backgroundColor: ehWeb ? 'transparent' : C.bg } }} />
      </ProvedorApp>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
