/** Estado do app: dados, seleção do card, filtros, favoritos, avisos e o botão ⟳. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Updates from 'expo-updates';
import type { Dados, Produto } from '@/logica/tipos';
import { separarSecoes, produtosSel as produtosSelL, mudarSelecao, secaoAtual, itemAtual, nomeSel, categoriaBusca, nomeCategoriaBusca, SELECAO_PADRAO, type Selecao } from '@/logica/secoes';
import { calcularNotas } from '@/logica/nota';
import { calcularOfertas } from '@/logica/ofertas';
import { calcularDestaques, type Destaque } from '@/logica/destaques';
import { contextoCupons, precoComCupom, precoFinal } from '@/logica/cupons';
import { FILTROS_PADRAO, POR_PAGINA, type EstadoFiltros } from '@/logica/filtros';
import { FILTROS_G_PADRAO, type EstadoFiltrosG } from '@/logica/ofertas';
import { decidirVersao, type ResultadoVersao, type RespostaVersao } from '@/logica/versao';
import { carregarLocal, aplicarDados, DADOS_VAZIOS } from '@/dados/repositorio';
import { buscarDados, buscarDadosGithub, lerVersao, lerNativoDireto } from '@/dados/api';
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

  // carga: cópia do aparelho na hora; depois a última coleta automática (GitHub, sem acordar o servidor); o servidor só se o GitHub falhar
  useEffect(() => {
    let vivo = true;
    (async () => {
      setAviso({tipo: 'info', texto: '⏳ Carregando as ofertas…'});
      // cada parte se protege: um erro na cópia guardada não pode impedir de baixar as ofertas (a tela ficava vazia)
      const vazio = {dados: DADOS_VAZIOS, novos: new Set<string>(), temDados: false};
      // tempo limite também no conjunto (cópia guardada + vistos): se travar, segue e baixa do GitHub
      const local = await Promise.race([carregarLocal().catch(() => vazio), new Promise<typeof vazio>(r => setTimeout(() => r(vazio), 9000))]);
      const [f, s] = await Promise.all([lerFavoritos().catch(() => new Set<string>()), lerSelecao().catch(() => SELECAO_PADRAO)]);
      if (!vivo) return;
      setDados(local.dados); setNovos(local.novos); setFavs(f); setSel(s); setCarregado(local.temDados);
      try {
        const novo = await buscarDadosGithub().catch(() => buscarDados(20000));
        const r = await aplicarDados(local.dados, novo);
        if (!vivo) return;
        if (r) { setDados(r.dados); setNovos(r.novos); }
        const final = r ? r.dados : local.dados;
        setAviso({tipo: 'ok', texto: `✔ Carregados os preços da última coleta (${final.ultimaAtualizacaoTexto || novo.ultimaAtualizacaoTexto || ''}).`});
      } catch {
        if (vivo) setAviso(local.temDados
          ? {tipo: 'erro', texto: `Não consegui baixar as ofertas novas agora. Mostrando as de ${local.dados.ultimaAtualizacaoTexto || 'antes'}; toque em ⟳ para tentar de novo.`}
          : {tipo: 'erro', texto: 'Não consegui baixar as ofertas agora. Confira a internet e toque em ⟳.'});
      } finally { if (vivo) setCarregado(true); }
    })();
    return () => { vivo = false; };
  }, []);

  const {pcs, jogos} = useMemo(() => separarSecoes(dados.produtos), [dados]);
  const {notas, melhorCb} = useMemo(() => calcularNotas(pcs), [pcs]);
  const ofertas = useMemo(() => calcularOfertas(jogos), [jogos]);
  // destaques pelo preço que se paga (com o cupom que com certeza vale). Calculados DEPOIS de mostrar as ofertas:
  // avaliar os cupons de centenas de produtos leva alguns segundos no celular e não pode segurar a abertura.
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  useEffect(() => {
    if (!dados.produtos.length) return;
    const t = setTimeout(() => setDestaques(calcularDestaques(dados.produtos, n => precoFinal(precoComCupom(dados.cupons, n), n))), 400);
    return () => clearTimeout(t);
  }, [dados]);
  // destaques: de tudo ao abrir; depois que a pessoa escolhe uma seção, só dela
  const [escolheu, setEscolheu] = useState(false);
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
    setEscolheu(true);
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
    if (!v || (v.tipo !== 'pagina' && v.tipo !== 'sugestao')) return;
    if (await lerTexto(CHAVES.dicaFechada) === v.versao) return;
    setDica(v);
  }, []);
  const fecharDica = useCallback(() => { if (dica?.tipo === 'pagina' || dica?.tipo === 'sugestao') gravarTexto(CHAVES.dicaFechada, dica.versao); setDica(null); }, [dica]);

  const verificarVersao = useCallback(async () => {
    let v: RespostaVersao | null = null;
    try { v = await lerVersao(); } catch { v = null; }
    // App baixado: se o servidor não souber do APK mais novo (ou não responder), confere direto no repositório (só sugestão)
    if (NATIVO && !v?.nativoNovo?.versao) {
      const nat = await lerNativoDireto();
      if (nat) v = {...(v || {}), nativoNovo: nat};
    }
    return decidirVersao(v, {nativo: NATIVO, versaoNativa: VERSAO_NATIVA, versaoWeb: VERSAO_WEB});
  }, []);

  /** ⟳: pesquisa só o card selecionado. App nativo desatualizado: avisa e só pesquisa depois de atualizar. Web nunca trava. */
  const atualizar = useCallback(async () => {
    if (atualizando) return;
    setAtualizando(true);
    // no app instalado, o ⟳ também procura código novo (OTA); o aviso em topo.tsx baixa e oferece aplicar
    if (NATIVO && Updates.isEnabled) Updates.checkForUpdateAsync().catch(() => {});
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
        mostrarDica(nova);   // APK mais novo publicado: só sugere (a busca segue abaixo)
      } else verificarVersao().then(mostrarDica);
      const cat = categoriaBusca(sel), nomeCat = nomeCategoriaBusca(sel);
      const r = await buscarCategoria(cat, p => {
        if (p.tipo === 'acordando') setAviso({tipo: 'info', texto: '☕ Acordando o servidor… (na primeira vez do dia pode levar até 1 minuto)'});
        else if (p.tipo === 'fila') setAviso({tipo: 'info', texto: `⏳ ${nomeCat}: na fila — outra busca está terminando… ${p.segundos}s`});
        else if (p.tipo === 'buscando') setAviso({tipo: 'info', texto: `🔎 Buscando preços de ${nomeCat} nas lojas… ${p.segundos}s`, detalhe: p.fontes});
      });
      const atual = dadosRef.current;
      if (!r.ok && r.motivo === 'erro') { setAviso({tipo: 'erro', texto: `⚠ ${r.mensagem}. Continuam os dados de ${atual.ultimaAtualizacaoTexto || '?'}.`}); return; }
      if (!r.ok) {
        // servidor fora do ar (dormindo demais, suspenso…): carrega a coleta automática mais recente (GitHub, a cada 30 min)
        const g = await buscarDadosGithub().then(d => aplicarDados(atual, d)).catch(() => null);
        if (g) { setDados(g.dados); setNovos(g.novos); }
        const quando = (g ? g.dados : atual).ultimaAtualizacaoTexto || 'não informado';
        setAviso({tipo: 'erro', texto: `O servidor de busca nas lojas não respondeu (${r.mensagem}). ${g ? 'Carreguei' : 'Continuam'} os preços da coleta automática mais recente: ${quando}.`,
          detalhe: 'A coleta automática roda sozinha a cada 30 minutos e não depende do servidor.'});
        return;
      }
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
    pcs, jogos, notas, melhorCb, ofertas, destaques, escolheu, prodSel, ctxCupons, escolher, alternarFav, alternarExp,
  };
}

export type EstadoApp = ReturnType<typeof useEstadoApp>;
const Ctx = createContext<EstadoApp | null>(null);
export function ProvedorApp({ children }: { children: ReactNode }) { const v = useEstadoApp(); return <Ctx.Provider value={v}>{children}</Ctx.Provider>; }
export const useApp = () => { const v = useContext(Ctx); if (!v) throw new Error('fora do ProvedorApp'); return v; };
export type { Produto };
