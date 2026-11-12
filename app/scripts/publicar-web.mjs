// Depois de `expo export -p web`: copia app/dist para ../web-novo (servido pelo FastAPI em /novo) e grava a versão.
import { cpSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(app, '..', 'web-novo');
rmSync(destino, {recursive: true, force: true});
cpSync(join(app, 'dist'), destino, {recursive: true});
const versao = readFileSync(join(app, 'src', 'versaoApp.ts'), 'utf8').match(/VERSAO_WEB = '([^']+)'/)[1];
writeFileSync(join(destino, 'versao.json'), JSON.stringify({versao}) + '\n');
console.log('web-novo publicado, versão', versao);
