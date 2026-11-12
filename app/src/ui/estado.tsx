/** Estado do app: dados, seleção do card, filtros, favoritos, avisos e o botão ⟳. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import type { Dados, Produto } from '@/logica/tipos';
import { separarSecoes, produtosSel as produtosSelL, mudarSelecao, secaoAtual, itemAtual, nomeSel, categoriaBusca, nomeCategoriaBusca, SELECAO_PADRAO, type Selecao } from '@/logica/secoes';
import { calcularNotas } from '@/logica/nota';
import { calcularOfertas } from '@/logica/ofertas';
import { contextoCupons } from '@/logica/cupons';
import { FILTROS_PADRAO, POR_PAGINA, type EstadoFiltros } from '@/logica/filtros';
import { FILTROS_G_PADRAO, type EstadoFiltrosG } from '@/logica/ofertas';
import { decidirVersao, type ResultadoVersao } from '@/logica/versao';
import { carregarLocal, aplicarDados, DADOS_VAZIOS } from '@/dados/repositorio';
import { buscarDados, lerVersao } from '@/dados/api';
import { buscarCategoria, resumoBusca } from '@/dados/busca';
import { lerFavoritos, guardarFavoritos, lerSelecao, guardarSelecao, lerTexto, gravarTexto, CHAVES } from '@/dados/armazenamento';
import { VERSAO_WEB } from '@/versaoApp';

export type TipoAviso = 'ok' | 'erro' | 'info' | 'versao';
export interface Aviso { tipo: TipoAviso; texto: string; detalhe?: string; versao?: {link?: string; pagina?: string; nova: string; atual: string} }
export interface FiltrosCupomUI { loja: string; cat: string; velhos: boolean; todos: boolean }

export const NATIVO = Platform.OS !== 'web';
export const VERSAO_NATIVA = NATIVO ? Application.nativeApplicationVersion : null;

function useEstadoApp() {
  const [dados, setDados] = useState<Dados>(DADOS_VAZIOS);
  const [carregado, setCarregado] = useState(false);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Selecao>(SELECAO_PADRAO);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(POR_PAGINA);
  const [limiteCupons, setLimiteCupons] = useState(50);
  const [filtros, setFiltrosE] = useState<EstadoFiltros>(FILTROS_PADRAO);
  const [filtrosG, setFiltrosGE] = useState<EstadoFiltrosG>(FILTROS_G_PADRAO);
  const [filtrosCupom, setFiltrosCupomE] = useState<FiltrosCupomUI>({loja: '', cat: '', velhos: false, todos: false});
  const [cuponsAbertos, setCuponsAbertos] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [dica, setDica] = useState<ResultadoVersao>(null);
  const [atualizando, setAtualizando] = useState(false);
  const dadosRef = useRef(dados);
  useEffect(() => { dadosRef.current = dados; }, [dados]);

  // carga: cópia do aparelho na hora; depois a última coleta do servidor (sem iniciar coleta nova)
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [local, f, s] = await Promise.all([carregarLocal(), lerFavoritos(), lerSelecao()]);
      if (!vivo) return;
      setDados(local.dados); setNovos(local.novos); setFavs(f); setSel(s); setCarregado(local.temDados);
      try {
        const r = await aplicarDados(local.dados, await buscarDados());
        if (vivo && r) { setDados(r.dados); setNovos(r.novos); setAviso({tipo: 'ok', texto: `✔ Carregados os preços da última coleta (${r.dados.ultimaAtualizacaoTexto || ''}).`}); }
      } catch {
        if (vivo && !local.temDados) setAviso({tipo: 'erro', texto: 'Não consegui falar com o servidor agora. Ele pode estar acordando: toque em ⟳ em 1 minuto.'});
      } finally { if (vivo) setCarregado(true); }
    })();
    return () => { vivo = false; };
  }, []);

  const {pcs, jogos} = useMemo(() => separarSecoes(dados.produtos), [dados]);
  const {notas, melhorCb} = useMemo(() => calcularNotas(pcs), [pcs]);
  const ofertas = useMemo(() => calcularOfertas(jogos), [jogos]);
  const prodSel = useMemo(() => produtosSelL(sel, pcs, jogos), [sel, pcs, jogos]);
  const ctxCupons = useMemo(() => contextoCupons(secaoAtual(sel), nomeSel(sel), prodSel, itemAtual(sel)?.cupom), [sel, prodSel]);
  const produtoSelecionado = useMemo(() => dados.produtos.find(n => n.id === selecionadoId) || null, [dados, selecionadoId]);

  const escolher = useCallback((nova: Partial<Selecao>) => {
    setSel(atual => {
      const s = mudarSelecao(atual, nova); guardarSelecao(s);
      const ps = produtosSelL(s, separarSecoes(dadosRef.current.produtos).pcs, separarSecoes(dadosRef.current.produtos).jogos);
      setSelecionadoId(id => (id && ps.some(n => n.id === id) ? id : null));
      return s;
    });
    setLimite(POR_PAGINA); setLimiteCupons(50); setFiltrosCupomE(f => ({...f, loja: '', cat: ''}));
  }, []);

  const alternarFav = useCallback((id: string) => setFavs(f => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); guardarFavoritos(n); return n; }), []);
  const alternarExp = useCallback((id: string) => setExpandidos(f => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const setFiltros = useCallback((m: Partial<EstadoFiltros>) => { setFiltrosE(f => ({...f, ...m})); setLimite(POR_PAGINA); }, []);
  const setFiltroSel = useCallback((id: string, v: string) => { setFiltrosE(f => ({...f, sel: {...f.sel, [id]: v}})); setLimite(POR_PAGINA); }, []);
  const limparFiltros = useCallback(() => { setFiltrosE(FILTROS_PADRAO); setLimite(POR_PAGINA); }, []);
  const setFiltrosG = useCallback((m: Partial<EstadoFiltrosG>) => { setFiltrosGE(f => ({...f, ...m})); setLimite(POR_PAGINA); }, []);
  const setFiltroSelG = useCallback((id: string, v: string) => { setFiltrosGE(f => ({...f, sel: {...f.sel, [id]: v}})); setLimite(POR_PAGINA); }, []);
  const limparFiltrosG = useCallback(() => { setFiltrosGE(FILTROS_G_PADRAO); setLimite(POR_PAGINA); }, []);
  const setFiltrosCupom = useCallback((m: Partial<FiltrosCupomUI>) => { setFiltrosCupomE(f => ({...f, ...m})); setLimiteCupons(50); }, []);

  const copiar = useCallback(async (t?: string) => { if (!t) return false; try { await Clipboard.setStringAsync(t); return true; } catch { return false; } }, []);

  const mostrarDica = useCallback(async (v: ResultadoVersao) => {
    if (!v || v.tipo !== 'pagina') return;
    if (await lerTexto(CHAVES.dicaFechada) === v.versao) return;
    setDica(v);
  }, []);
  const fecharDica = useCallback(() => { if (dica?.tipo === 'pagina') gravarTexto(CHAVES.dicaFechada, dica.versao); setDica(null); }, [dica]);

  const verificarVersao = useCallback(async () => {
    try { return decidirVersao(await lerVersao(), {nativo: NATIVO, versaoNativa: VERSAO_NATIVA, versaoWeb: VERSAO_WEB}); } catch { return null; }
  }, []);

  /** ⟳: pesquisa só o card selecionado. App nativo desatualizado: avisa e só pesquisa depois de atualizar. Web nunca trava. */
  const atualizar = useCallback(async () => {
    if (atualizando) return;
    setAtualizando(true);
    try {
      setAviso({tipo: 'info', texto: '🔄 Conectando ao servidor…'});
      if (NATIVO) {
        const nova = await verificarVersao();
        if (nova && nova.tipo === 'app') {
          setAviso({tipo: 'versao', texto: `🆕 Nova versão disponível do app para Android: ${nova.versao} (o seu é ${VERSAO_NATIVA}).`,
            detalhe: 'Abra o APK baixado e toque em Atualizar (os favoritos continuam no aparelho). A busca de preços fica pausada até atualizar.',
            versao: {link: nova.link, pagina: nova.pagina, nova: nova.versao, atual: VERSAO_NATIVA || '?'}});
          return;
        }
      } else verificarVersao().then(mostrarDica);
      const cat = categoriaBusca(sel), nomeCat = nomeCategoriaBusca(sel);
      const r = await buscarCategoria(cat, p => {
        if (p.tipo === 'acordando') setAviso({tipo: 'info', texto: '☕ Acordando o servidor… (na primeira vez do dia pode levar até 1 minuto)'});
        else if (p.tipo === 'fila') setAviso({tipo: 'info', texto: `⏳ ${nomeCat}: na fila — outra busca está terminando… ${p.segundos}s`});
        else if (p.tipo === 'buscando') setAviso({tipo: 'info', texto: `🔎 Buscando preços de ${nomeCat} nas lojas… ${p.segundos}s`, detalhe: p.fontes});
      });
      const atual = dadosRef.current;
      if (!r.ok && r.motivo === 'erro') { setAviso({tipo: 'erro', texto: `⚠ ${r.mensagem}. Continuam os dados de ${atual.ultimaAtualizacaoTexto || '?'}.`}); return; }
      if (!r.ok) { setAviso({tipo: 'erro', texto: `Não consegui falar com o servidor agora (${r.mensagem}). Ele pode estar acordando: tente de novo em 1 minuto. Dados de: ${atual.ultimaAtualizacaoTexto || 'não informado'}.`}); return; }
      const ap = await aplicarDados(atual, r.dados);
      const final = ap ? ap.dados : atual;
      if (ap) { setDados(ap.dados); setNovos(ap.novos); }
      setAviso({tipo: r.falhas.length ? 'erro' : 'ok', texto: resumoBusca(cat, nomeCat, r.status, final.ultimaAtualizacaoTexto || '', ap ? ap.novos.size : 0),
        detalhe: r.falhas.length ? `Sem resposta nesta vez (mantido o preço anterior): ${r.falhas.join(' · ')}` : undefined});
    } finally { setAtualizando(false); }
  }, [atualizando, sel, verificarVersao, mostrarDica]);

  return {
    dados, carregado, novos, favs, sel, selecionadoId, setSelecionadoId, produtoSelecionado, expandidos, limite, setLimite, limiteCupons, setLimiteCupons,
    filtros, setFiltros, setFiltroSel, limparFiltros, filtrosG, setFiltrosG, setFiltroSelG, limparFiltrosG, filtrosCupom, setFiltrosCupom,
    cuponsAbertos, setCuponsAbertos, aviso, setAviso, dica, fecharDica, atualizando, atualizar, copiar,
    pcs, jogos, notas, melhorCb, ofertas, prodSel, ctxCupons, escolher, alternarFav, alternarExp,
  };
}

export type EstadoApp = ReturnType<typeof useEstadoApp>;
const Ctx = createContext<EstadoApp | null>(null);
export function ProvedorApp({ children }: { children: ReactNode }) { const v = useEstadoApp(); return <Ctx.Provider value={v}>{children}</Ctx.Provider>; }
export const useApp = () => { const v = useContext(Ctx); if (!v) throw new Error('fora do ProvedorApp'); return v; };
export type { Produto };
