// Ajusta o expo-updates (Android) para aceitar o manifesto de atualização servido direto pelo GitHub
// (raw.githubusercontent.com/…/app-ota/manifest.json), que não manda o cabeçalho "expo-protocol-version".
// Sem o cabeçalho, a biblioteca recusa ("Legacy manifests are no longer supported"); aqui a falta vira protocolo 1,
// que é o formato que o scripts/manifesto-ota.mjs gera. O app continua só abrindo atualização com o mesmo runtimeVersion.
// Roda no postinstall (npm ci), antes do expo prebuild/gradle montarem o APK. Idempotente.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arq = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'expo-updates', 'android', 'src', 'main', 'java',
  'expo', 'modules', 'updates', 'manifest', 'ResponseHeaderData.kt');
if (!existsSync(arq)) {
  console.log('ajustar-expo-updates: expo-updates não instalado; nada a fazer');
} else {
  const antes = 'val protocolVersion = protocolVersionRaw?.let { Integer.valueOf(it) }';
  const depois = 'val protocolVersion = protocolVersionRaw?.let { Integer.valueOf(it) } ?: 1 /* Tudo-Busca: manifesto direto do GitHub */';
  const s = readFileSync(arq, 'utf8');
  if (s.includes(depois)) console.log('ajustar-expo-updates: já ajustado');
  else if (!s.includes(antes)) { console.error('ajustar-expo-updates: trecho não encontrado (versão nova do expo-updates?)'); process.exit(1); }
  else { writeFileSync(arq, s.replace(antes, depois)); console.log('ajustar-expo-updates: ajustado (aceita manifesto sem expo-protocol-version)'); }
}
