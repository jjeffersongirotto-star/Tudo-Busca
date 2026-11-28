/** Guarda no aparelho (AsyncStorage; no navegador vira localStorage). As chaves são as mesmas da página antiga,
 *  então quem já usava o site no mesmo endereço mantém favoritos, seleção e a cópia offline. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dados } from '@/logica/tipos';
import { valido } from '@/logica/dados';
import { SELECAO_PADRAO, type Selecao } from '@/logica/secoes';

export const CHAVES = {
  cache: 'buscadorDell_dadosCache',
  favoritos: 'buscadorDell_favoritos',
  vistos: 'buscadorDell_idsVistos',
  selecao: 'tudoBusca_selecao',
  dicaFechada: 'tb_dica_fechada',
} as const;

/** Promessa com tempo limite: no Android, ler um item muito grande do AsyncStorage pode nunca responder (o app ficava em
 *  "Carregando…" para sempre). Passado o tempo, segue como se não houvesse nada guardado. */
const comLimite = <T,>(p: Promise<T>, ms: number, padrao: T) =>
  Promise.race([p, new Promise<T>(r => setTimeout(() => r(padrao), ms))]);

async function lerJSON<T>(chave: string, ms = 4000): Promise<T | null> {
  try {
    const s = await comLimite(AsyncStorage.getItem(chave), ms, null);
    return s ? JSON.parse(s) as T : null;
  } catch { return null; }
}
async function gravarJSON(chave: string, v: unknown) {
  // gravação também com tempo limite: se o armazenamento travar, o app segue (só não guarda desta vez)
  try { await comLimite(AsyncStorage.setItem(chave, JSON.stringify(v)), 4000, undefined); } catch { /* cheio ou indisponível */ }
}

/** A cópia offline guardada; se não vier a tempo (item grande demais), é apagada para não travar a próxima abertura. */
export const lerCache = async (): Promise<Dados | null> => {
  const d = await lerJSON<Dados>(CHAVES.cache, 5000);
  if (valido(d)) return d;
  AsyncStorage.removeItem(CHAVES.cache).catch(() => {});
  return null;
};
/** Limite da cópia offline: acima disso o AsyncStorage do Android falha ou trava ao ler (limite de ~2 MB por item).
 *  Sem cópia, o app abre com a cópia embutida e baixa as ofertas do GitHub. */
export const LIMITE_CACHE = 1_800_000;
export const guardarCache = async (d: Dados) => {
  try {
    const s = JSON.stringify(d);
    if (s.length > LIMITE_CACHE) { await comLimite(AsyncStorage.removeItem(CHAVES.cache), 4000, undefined); return; }
    await comLimite(AsyncStorage.setItem(CHAVES.cache, s), 4000, undefined);
  } catch { /* cheio ou indisponível: segue sem guardar */ }
};
export const lerFavoritos = async () => new Set(await lerJSON<string[]>(CHAVES.favoritos) || []);
export const guardarFavoritos = (f: Set<string>) => gravarJSON(CHAVES.favoritos, [...f]);
export const lerVistos = () => lerJSON<string[]>(CHAVES.vistos);
export const guardarVistos = (ids: string[]) => gravarJSON(CHAVES.vistos, ids);
export const lerSelecao = async (): Promise<Selecao> => ({...SELECAO_PADRAO, ...(await lerJSON<Selecao>(CHAVES.selecao) || {})});
export const guardarSelecao = (s: Selecao) => gravarJSON(CHAVES.selecao, s);
export const lerTexto = async (k: string) => { try { return await comLimite(AsyncStorage.getItem(k), 4000, null); } catch { return null; } };
export const gravarTexto = async (k: string, v: string) => { try { await comLimite(AsyncStorage.setItem(k, v), 4000, undefined); } catch { /* ignora */ } };
