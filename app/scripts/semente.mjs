// Copia dados/dados.json (da raiz do repositório) para app/assets/semente.json: cópia embutida no app nativo.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(app, '..', 'dados', 'dados.json'), destino = join(app, 'assets', 'semente.json');
if (existsSync(origem)) copyFileSync(origem, destino);
else if (!existsSync(destino)) writeFileSync(destino, JSON.stringify({cupons: [], produtos: []}));
console.log('semente:', destino);
