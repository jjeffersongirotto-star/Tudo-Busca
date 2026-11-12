/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { Dados } from '../src/logica/tipos';
const ler = (n: string) => JSON.parse(gunzipSync(readFileSync(join(__dirname, 'fixtures', n))).toString('utf8'));
/** Retrato dos dados + resultados das funções ORIGINAIS do cupons-dell.html (gerados no Chrome). */
export const DADOS: Dados = ler('dados.json.gz');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ESPERADO: any = ler('esperado.json.gz');
