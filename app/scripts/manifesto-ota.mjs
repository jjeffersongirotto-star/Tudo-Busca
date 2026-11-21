// Gera o manifesto de atualização OTA (protocolo expo-updates) a partir de `expo export -p android`.
// Uso: node scripts/manifesto-ota.mjs <pasta do export> <URL base onde os arquivos ficam publicados>
// O servidor (servidor/app.py, /api/ota/manifest) só repassa este manifesto ao app; os arquivos são baixados direto da URL base.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const [pasta, base] = process.argv.slice(2);
if (!pasta || !base) throw new Error('uso: node scripts/manifesto-ota.mjs <pasta> <url-base>');
const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const runtimeVersion = typeof app.runtimeVersion === 'string' ? app.runtimeVersion : null;
if (!runtimeVersion) throw new Error('app.json precisa de "runtimeVersion" fixo (texto) para as atualizações OTA');

const meta = JSON.parse(readFileSync(join(pasta, 'metadata.json'), 'utf8')).fileMetadata.android;
const b64url = buf => createHash('sha256').update(buf).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const md5 = buf => createHash('md5').update(buf).digest('hex');
const url = p => base.replace(/\/$/, '') + '/' + p;

const bundle = readFileSync(join(pasta, meta.bundle));
// id do update: UUID derivado do conteúdo (o mesmo código gera o mesmo id; o app não baixa de novo)
const h = createHash('sha256').update(bundle);
for (const a of meta.assets) h.update(a.path);
const hex = h.digest('hex');
const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 | (parseInt(hex[16], 16) & 3)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;

const manifesto = {
  id,
  createdAt: new Date().toISOString(),
  runtimeVersion,
  launchAsset: {hash: b64url(bundle), key: md5(bundle), contentType: 'application/javascript', fileExtension: '.bundle', url: url(meta.bundle)},
  // a "key" de cada arquivo precisa ser o nome que o código usa para achá-lo (o hash md5 que o export põe no nome)
  assets: meta.assets.map(a => {
    const buf = readFileSync(join(pasta, a.path));
    return {hash: b64url(buf), key: basename(a.path), contentType: tipo(a.ext), fileExtension: '.' + a.ext, url: url(a.path)};
  }),
  metadata: {},
  extra: {},
};
writeFileSync(join(pasta, 'manifest.json'), JSON.stringify(manifesto, null, 1));
console.log(`manifesto OTA: id ${id}, runtime ${runtimeVersion}, ${manifesto.assets.length} arquivos`);

function tipo(ext) {
  return {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ttf: 'font/ttf', otf: 'font/otf',
    json: 'application/json'}[ext] || 'application/octet-stream';
}
