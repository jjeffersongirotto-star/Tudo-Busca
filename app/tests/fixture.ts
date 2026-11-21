/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { Dados } from '../src/logica/tipos';
const ler = (n: string) => JSON.parse(gunzipSync(readFileSync(join(__dirname, 'fixtures', n))).toString('utf8'));
/** Retrato dos dados + resultados das funções ORIGINAIS do cupons-dell.html (gerados no Chrome).
 *  21/11/2026: escopo/lista/melhor/fora/coluna dos cupons regravados a partir do app, que passou a descartar cupom de outra
 *  marca ou modelo (ex.: "linha Alienware" para um Dell 15) e a tratar "produtos específicos" como itens selecionados. */
export const DADOS: Dados = ler('dados.json.gz');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ESPERADO: any = ler('esperado.json.gz');
