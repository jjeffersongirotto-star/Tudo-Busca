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

async function lerJSON<T>(chave: string): Promise<T | null> {
  try { const s = await AsyncStorage.getItem(chave); return s ? JSON.parse(s) as T : null; } catch { return null; }
}
async function gravarJSON(chave: string, v: unknown) {
  try { await AsyncStorage.setItem(chave, JSON.stringify(v)); } catch { /* cheio ou indisponível: segue sem guardar */ }
}

export const lerCache = async (): Promise<Dados | null> => { const d = await lerJSON<Dados>(CHAVES.cache); return valido(d) ? d : null; };
export const guardarCache = (d: Dados) => gravarJSON(CHAVES.cache, d);
export const lerFavoritos = async () => new Set(await lerJSON<string[]>(CHAVES.favoritos) || []);
export const guardarFavoritos = (f: Set<string>) => gravarJSON(CHAVES.favoritos, [...f]);
export const lerVistos = () => lerJSON<string[]>(CHAVES.vistos);
export const guardarVistos = (ids: string[]) => gravarJSON(CHAVES.vistos, ids);
export const lerSelecao = async (): Promise<Selecao> => ({...SELECAO_PADRAO, ...(await lerJSON<Selecao>(CHAVES.selecao) || {})});
export const guardarSelecao = (s: Selecao) => gravarJSON(CHAVES.selecao, s);
export const lerTexto = async (k: string) => { try { return await AsyncStorage.getItem(k); } catch { return null; } };
export const gravarTexto = async (k: string, v: string) => { try { await AsyncStorage.setItem(k, v); } catch { /* ignora */ } };
