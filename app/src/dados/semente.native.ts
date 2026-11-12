/** App nativo: cópia dos dados embutida no APK (gerada por scripts/semente.mjs a partir de dados/dados.json),
 *  para abrir mesmo sem internet na primeira vez. */
import type { Dados } from '@/logica/tipos';
export const semente = (): Dados | null => require('../../assets/semente.json') as Dados;
