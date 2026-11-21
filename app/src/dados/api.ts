/** Cliente do servidor FastAPI (servidor/app.py). */
import { Platform } from 'react-native';
import type { Dados } from '@/logica/tipos';
import type { FonteStatus } from '@/logica/dados';
import type { RespostaVersao } from '@/logica/versao';

export const SERVIDOR_PUBLICO = 'https://tudo-busca.onrender.com';

/** No site servido pelo próprio servidor (/novo), usa o mesmo endereço; no app nativo e no `expo start`, o servidor público
 *  (ou EXPO_PUBLIC_API_URL, para testar com um servidor local). */
export function baseServidor(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof location !== 'undefined' && /^https?:/.test(location.protocol)) {
    if (location.pathname.startsWith('/novo') || location.origin === SERVIDOR_PUBLICO) return '';
  }
  return SERVIDOR_PUBLICO;
}

export class ErroApi extends Error {}

export async function api<T>(caminho: string, opcoes: RequestInit = {}, limiteMs = 70000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), limiteMs);
  try {
    const r = await fetch(baseServidor() + caminho, {cache: 'no-store', ...opcoes, signal: ctl.signal});
    if (!r.ok) throw new ErroApi('HTTP ' + r.status);
    return await r.json() as T;
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new ErroApi('tempo esgotado');
    throw e;
  } finally { clearTimeout(t); }
}

export type Categoria = 'computadores' | 'games' | 'todas';
export interface Status {
  estado: 'parado' | 'rodando' | 'concluido' | 'erro';
  categoria?: Categoria;
  fila?: boolean;
  recente?: boolean;
  erro?: string | null;
  fontes?: Record<string, FonteStatus>;
  resumo?: {produtos?: number; precosAtualizados?: number; novos?: number; removidos?: number; porSecao?: Record<string, number>; novosGames?: number; fontes?: Record<string, FonteStatus>} | null;
  categorias?: Record<string, {estado: string; fim: number | null}>;
}

export const buscarDados = (limiteMs = 90000) => api<Dados>('/api/dados', {}, limiteMs);
export const pedirAtualizacao = (c: Categoria) => api<Status>('/api/atualizar?categoria=' + c, {method: 'POST'}, 90000);
export const lerStatus = (c: Categoria) => api<Status>('/api/status?categoria=' + c);
export const lerVersao = () => api<RespostaVersao>('/api/versao', {}, 30000);

/** Último APK publicado, lido direto do repositório (dados/nativo.json, gravado pelo workflow do APK).
 *  Plano B quando o servidor não sabe (ex.: GitHub limitou as consultas dele). */
export const NATIVO_RAW = 'https://raw.githubusercontent.com/jjeffersongirotto-star/Tudo-Busca/main/dados/nativo.json';
export async function lerNativoDireto(limiteMs = 15000): Promise<RespostaVersao['nativo']> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), limiteMs);
  try {
    const r = await fetch(NATIVO_RAW + '?t=' + Math.floor(Date.now() / 300000), {cache: 'no-store', signal: ctl.signal});
    if (!r.ok) return null;
    const j = await r.json() as {versao?: string; android?: string; pagina?: string};
    return j && /^\d+\.\d+\.\d+$/.test(String(j.versao || '')) ? {versao: j.versao, android: j.android, pagina: j.pagina} : null;
  } catch { return null; } finally { clearTimeout(t); }
}
