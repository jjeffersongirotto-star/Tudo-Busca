/** Coluna do meio: título, filtros, regras e os cards (favoritos primeiro, de 50 em 50). */
import { memo, useMemo } from 'react';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';
import { T, Meta, Tag, Botao, Select, Check, Foto, Barra, Recolhivel, Icone } from './base';
import { C, RAIO } from './tema';
import { useApp } from './estado';
import { InfoPC, InfoG, TagCat, TagPerfil, BadgeDesc } from './detalhes';
import { RegrasPC, RegrasG } from './regras';
import type { Produto } from '@/logica/tipos';
import { FILTROS, OPCOES_NUM, POR_PAGINA, ICONE_TIPO, opcoesFiltros, filtrados, montarLista, valorNota } from '@/logica/filtros';
import { FILTROS_G, OPCOES_G, opcoesFiltrosG, filtradosG, type NotaG } from '@/logica/ofertas';
import { cuponsDaLoja, melhorComCupom } from '@/logica/cupons';
import { secaoAtual, subAtual, itemAtual, nomeSel } from '@/logica/secoes';
import type { Pontuacao } from '@/logica/nota';
import { fmt1, fmtPol, reais, ni } from '@/logica/formato';

function Cartao({ n, fav, aberto, sel, novo, foraFiltro, aoSelecionar, aoFav, aoExp, children, topo, corpo }: {
  n: Produto; fav: boolean; aberto: boolean; sel: boolean; novo: boolean; foraFiltro: boolean; aoSelecionar: () => void; aoFav: () => void; aoExp: () => void;
  children?: React.ReactNode; topo: React.ReactNode; corpo: React.ReactNode;
}) {
  const d = n.descontoPct || 0;
  const borda = sel ? C.roxo : fav ? 'rgba(250,204,21,0.55)' : d >= 20 ? '#ec4899' : d > 0 ? 'rgba(251,146,60,0.35)' : C.borda;
  const fundo = sel ? 'rgba(28,24,48,0.97)' : d >= 20 ? 'rgba(40,20,30,0.96)' : 'rgba(255,255,255,0.04)';
  return (
    <Pressable onPress={aberto ? undefined : aoSelecionar} accessibilityRole="button" accessibilityState={{selected: sel}} testID="card"
      style={(estado) => { const hovered = (estado as {hovered?: boolean}).hovered; return [st.note, {borderColor: hovered && !sel ? 'rgba(167,139,250,0.45)' : borda, backgroundColor: fundo, borderWidth: sel || d >= 20 ? 1.5 : 1}]; }}>
      <Pressable onPress={aoFav} style={[st.redondo, {top: 10}, fav && {backgroundColor: 'rgba(250,204,21,0.18)', borderColor: 'rgba(250,204,21,0.6)'}]}
        accessibilityRole="button" accessibilityLabel={fav ? 'Remover dos favoritos' : 'Favoritar'} accessibilityState={{selected: fav}} testID="fav">{Icone.estrela(fav)}</Pressable>
      <Pressable onPress={aoExp} style={[st.redondo, {top: 52}]} accessibilityRole="button" accessibilityLabel={aberto ? 'Recolher informações' : 'Ver todas as informações'} accessibilityState={{expanded: aberto}} testID="expandir">
        {aberto ? Icone.menos() : Icone.mais()}</Pressable>
      {fav && foraFiltro ? <View style={st.tags}><Tag>★ favorito fora dos filtros atuais</Tag></View> : null}
      <View style={{flexDirection: 'row', gap: 12, alignItems: 'flex-start'}}>
        <Foto url={n.imagem} nome={n.nome} />
        <View style={{flex: 1, minWidth: 0}}>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4}}>
            <View style={st.lojaTag}><T peso="negrito" style={{fontSize: 10.9}}>{n.loja || 'Dell.com'}</T></View>
            <T peso="negrito" style={st.linhaTag}>{topo}</T>
            {novo ? <Tag grad={['#f97316', '#ec4899']} cor="#fff">NOVO</Tag> : null}
          </View>
          <T peso="negrito" style={st.h3} testID="nomeProduto">{n.nome}</T>
        </View>
      </View>
      {corpo}
      {aberto ? <View style={st.expandido}>{children}</View> : null}
    </Pressable>
  );
}

const Preco = ({ n }: { n: Produto }) => (
  <View style={st.preco}>
    <T peso="extra" style={{fontSize: 17.9}}>{n.preco || 'Preço não informado'}</T>
    {n.precoDe ? <T style={{color: C.fraco, fontSize: 12.5, textDecorationLine: 'line-through'}}>{n.precoDe}</T> : null}
    <BadgeDesc n={n} />
  </View>
);
const TagVelho = ({ n }: { n: Produto }) => n.precoAntigo ? <Tag fundo="rgba(251,146,60,0.14)" cor="#fdba74">⚠ preço de coleta anterior</Tag> : null;

const CardPC = memo(function CardPC({ n, r, usaPreco, ...p }: { n: Produto; r?: Pontuacao; usaPreco: boolean; fav: boolean; aberto: boolean; sel: boolean; novo: boolean; foraFiltro: boolean; aoSelecionar: () => void; aoFav: () => void; aoExp: () => void }) {
  const topo = `${ICONE_TIPO[n.tipo || ''] || '💻'} ${n.marca && n.linha && !String(n.linha).includes(n.marca) && n.linha !== n.marca ? n.marca + ' · ' + n.linha : (n.linha || n.marca || '')}`;
  const corpo = (
    <>
      <View style={st.tags}>
        {r ? <TagCat cat={r.cat} /> : null}
        <TagPerfil n={n} />
        {n.gpuDedicada ? <Tag>🎮 {n.gpuModelo || 'GPU dedicada'}</Tag> : null}
        {n.pesoKg ? <Tag>⚖️ {String(n.pesoKg).replace('.', ',')} kg</Tag> : null}
        <TagVelho n={n} />
      </View>
      <T style={st.resumo}>{ni(n.cpuModelo || n.procFamilia)} · {n.ramGB ? n.ramGB + ' GB RAM' : 'RAM não informada'} · {ni(n.armazenamento)} SSD · {fmtPol(n.telaPol)}</T>
      <Preco n={n} />
      {!r ? null : !usaPreco ? <Barra rotulo="Desempenho" valor={r.total} texto={`${fmt1(r.total)}/100`} />
        : r.cbFinal == null ? <Barra rotulo="Custo-benefício" valor={0} texto="sem preço" /> : <Barra rotulo="Custo-benefício" valor={r.cbFinal} texto={`${fmt1(r.cbFinal)}/100`} />}
      {r && r.rotulosEst.length ? <View style={st.tags}><Tag fundo="rgba(250,204,21,0.12)" cor="#fde68a" borda="rgba(250,204,21,0.35)">estimado: {r.rotulosEst.join(', ')}</Tag></View> : null}
    </>
  );
  return <Cartao n={n} {...p} topo={topo} corpo={corpo}><InfoPC n={n} noCard /></Cartao>;
});

const CardG = memo(function CardG({ n, r, nc, mc, ...p }: { n: Produto; r?: NotaG; nc: number; mc: ReturnType<typeof melhorComCupom>; fav: boolean; aberto: boolean; sel: boolean; novo: boolean; foraFiltro: boolean; aoSelecionar: () => void; aoFav: () => void; aoExp: () => void }) {
  const topo = `🎮 ${n.original ? 'Sony · ' + n.modelo : (n.marca && n.marca !== 'Sem marca conhecida' ? n.marca : 'outra marca')}`;
  const corpo = (
    <>
      <View style={st.tags}>
        {n.original ? <Tag fundo="rgba(34,197,94,0.14)" cor="#86efac">✔ Original Sony</Tag> : <Tag fundo="rgba(56,189,248,0.13)" cor="#7dd3fc">Compatível (outra marca)</Tag>}
        {n.edicao ? <Tag>{n.edicao}</Tag> : null}
        {n.kit ? <Tag fundo="rgba(251,146,60,0.14)" cor="#fdba74">kit</Tag> : null}
        {r && r.nota != null && r.nota >= 75 ? <Tag grad={['#f97316', '#ec4899']} cor="#fff">🔥 bom preço</Tag> : null}
        {nc ? <Tag fundo="rgba(34,211,238,0.12)" cor="#a5f3fc">🏷️ {nc} cupom(ns) da loja</Tag> : null}
        <TagVelho n={n} />
      </View>
      <Preco n={n} />
      {mc ? <Meta>🏷️ com cupom <T peso="extra" style={{fontSize: 12.3}}>{mc.c.codigo}</T>: ~{reais(mc.a.estimado)} ({mc.e.tipo === 'item' ? 'cupom do item' : 'cupom geral da loja'}{mc.a.min ? ', mínimo ' + reais(mc.a.min) + ' ✔' : ''})</Meta> : null}
      {!r || r.nota == null || r.pct == null ? <Barra rotulo="Oferta" valor={0} texto="—" />
        : <Barra rotulo="Oferta" valor={r.nota} texto={`${fmt1(r.nota)}/100`} extra={r.pct >= 0 ? `${fmt1(r.pct)}% abaixo do típico` : `${fmt1(-r.pct)}% acima do típico`} />}
    </>
  );
  return <Cartao n={n} {...p} topo={topo} corpo={corpo}><InfoG n={n} noCard /></Cartao>;
});

function FiltrosPC({ colunas }: { colunas: number }) {
  const {pcs, notas, filtros: f, setFiltros, setFiltroSel, limparFiltros} = useApp();
  const op = useMemo(() => opcoesFiltros(pcs, notas), [pcs, notas]);
  const w = `${100 / colunas}%` as const;
  const caixa = (el: React.ReactNode, k: string, cheio?: boolean) => <View key={k} style={{width: cheio && colunas <= 2 ? '100%' : w, padding: 5}}>{el}</View>;
  return (
    <View style={st.filtros} testID="filtros">
      {FILTROS.map(x => caixa(<Select rotulo={x.rotulo} valor={f.sel[x.id] || ''} aoMudar={v => setFiltroSel(x.id, v)}
        opcoes={[['', x.todos], ...op[x.id].map(o => [o.v, `${o.v} (${o.n})`] as const)]} />, x.id)).slice(0, 7)}
      {caixa(<Select rotulo="RAM mínima" valor={f.fRam} opcoes={OPCOES_NUM.fRam} aoMudar={v => setFiltros({fRam: v})} />, 'fRam')}
      {caixa(<Select rotulo="Armazenamento mínimo" valor={f.fArm} opcoes={OPCOES_NUM.fArm} aoMudar={v => setFiltros({fArm: v})} />, 'fArm')}
      {FILTROS.slice(7).map(x => caixa(<Select rotulo={x.rotulo} valor={f.sel[x.id] || ''} aoMudar={v => setFiltroSel(x.id, v)}
        opcoes={[['', x.todos], ...op[x.id].map(o => [o.v, `${o.v} (${o.n})`] as const)]} />, x.id))}
      {caixa(<Select rotulo="GPU dedicada" valor={f.fGpuDed} opcoes={OPCOES_NUM.fGpuDed} aoMudar={v => setFiltros({fGpuDed: v})} />, 'fGpuDed')}
      {caixa(<Select rotulo="Peso até" valor={f.fPeso} opcoes={OPCOES_NUM.fPeso} aoMudar={v => setFiltros({fPeso: v})} />, 'fPeso')}
      {caixa(<Select rotulo="Preço até (R$)" valor={f.fPreco} opcoes={OPCOES_NUM.fPreco} aoMudar={v => setFiltros({fPreco: v})} />, 'fPreco')}
      {caixa(<Select rotulo="Desconto mínimo" valor={f.fDescMin} opcoes={OPCOES_NUM.fDescMin} aoMudar={v => setFiltros({fDescMin: v})} />, 'fDescMin')}
      {caixa(<Select rotulo="Ordenar" valor={f.fOrdem} opcoes={OPCOES_NUM.fOrdem} aoMudar={v => setFiltros({fOrdem: v as typeof f.fOrdem})} />, 'fOrdem')}
      {caixa(<Check rotulo="Custo-benefício (considerar o preço)" valor={f.fCB} aoMudar={v => setFiltros({fCB: v})} style={{paddingTop: 18}} />, 'fCB', true)}
      {caixa(<Check rotulo="Só promoções acima de 20%" valor={f.fPromo20} aoMudar={v => setFiltros({fPromo20: v})} style={{paddingTop: 18}} />, 'fPromo20', true)}
      {caixa(<Botao tipo="contorno" titulo="Limpar filtros" onPress={limparFiltros} style={{marginTop: 14}} />, 'limpar', true)}
    </View>
  );
}

function FiltrosG({ colunas, base }: { colunas: number; base: Produto[] }) {
  const {filtrosG: f, setFiltrosG, setFiltroSelG, limparFiltrosG} = useApp();
  const op = useMemo(() => opcoesFiltrosG(base), [base]);
  const w = `${100 / colunas}%` as const;
  const caixa = (el: React.ReactNode, k: string, cheio?: boolean) => <View key={k} style={{width: cheio && colunas <= 2 ? '100%' : w, padding: 5}}>{el}</View>;
  return (
    <View style={st.filtros} testID="filtrosG">
      {FILTROS_G.map(x => caixa(<Select rotulo={x.rotulo} valor={f.sel[x.id] || ''} aoMudar={v => setFiltroSelG(x.id, v)}
        opcoes={[['', x.todos], ...op[x.id].map(o => [o.v, `${o.v} (${o.n})`] as const)]} />, x.id))}
      {caixa(<Select rotulo="Preço até (R$)" valor={f.gPreco} opcoes={OPCOES_G.gPreco} aoMudar={v => setFiltrosG({gPreco: v})} />, 'gPreco')}
      {caixa(<Select rotulo="Ordenar" valor={f.gOrdem} opcoes={OPCOES_G.gOrdem} aoMudar={v => setFiltrosG({gOrdem: v as typeof f.gOrdem})} />, 'gOrdem')}
      {caixa(<Check rotulo="Só originais (Sony)" valor={f.gOriginal} aoMudar={v => setFiltrosG({gOriginal: v})} style={{paddingTop: 18}} />, 'gOriginal', true)}
      {caixa(<Check rotulo="Esconder kits (controle + jogo/base)" valor={f.gSemKit} aoMudar={v => setFiltrosG({gSemKit: v})} style={{paddingTop: 18}} />, 'gSemKit', true)}
      {caixa(<Botao tipo="contorno" titulo="Limpar filtros" onPress={limparFiltrosG} style={{marginTop: 14}} />, 'limpar', true)}
    </View>
  );
}

export function ColunaLista({ largura, aoSelecionar }: { largura: number; aoSelecionar: (id: string) => void }) {
  const app = useApp();
  const {sel, pcs, jogos, notas, ofertas, prodSel, favs, expandidos, selecionadoId, novos, limite, setLimite, filtros, filtrosG, dados, alternarFav, alternarExp} = app;
  const {width} = useWindowDimensions();
  const s = secaoAtual(sel), sb = subAtual(sel), it = itemAtual(sel);
  const pc = s.id === 'computadores' && !sb.emBreve;
  const colFiltros = width <= 500 ? 2 : Math.max(2, Math.min(6, Math.floor(largura / 165)));
  const grade = width > 700 ? 2 : 1;

  const lista = useMemo(() => {
    if (sb.emBreve) return null;
    if (pc) {
      const l = filtrados(pcs, notas, filtros);
      return {l, total: pcs, ...montarLista(pcs, l, favs, limite, (a, b) => valorNota(b, notas, filtros.fCB) - valorNota(a, notas, filtros.fCB))};
    }
    const l = filtradosG(prodSel, ofertas.notas, filtrosG);
    return {l, total: prodSel, ...montarLista(prodSel, l, favs, limite)};
  }, [sb.emBreve, pc, pcs, notas, filtros, favs, limite, prodSel, ofertas, filtrosG]);
  const baseG = prodSel.length || sel.secao !== 'games' ? prodSel : jogos;

  const titulo = `${it ? it.icone : sb.emBreve ? sb.icone : s.icone} ${nomeSel(sel)}`;
  const cont = !lista ? '' : `${lista.l.length} de ${lista.total.length}` + (lista.favoritos.length ? ` · ★ ${lista.favoritos.length}` + (pc && lista.foraFiltro ? ` (${lista.foraFiltro} fora dos filtros)` : '') : '');
  const itens = lista ? [...lista.favoritos, ...lista.mostrados] : [];

  const props = (n: Produto) => ({fav: favs.has(n.id), aberto: expandidos.has(n.id), sel: n.id === selecionadoId, novo: novos.has('n:' + n.id),
    foraFiltro: !!lista && !lista.noFiltro.has(n.id), aoSelecionar: () => aoSelecionar(n.id), aoFav: () => alternarFav(n.id), aoExp: () => alternarExp(n.id)});

  return (
    <View>
      <View style={st.h2}><T peso="extra" style={{fontSize: 16}}>{titulo} <T peso="semi" style={{fontSize: 12, color: C.sub}} testID="contNotes">{cont}</T></T></View>
      {pc ? <FiltrosPC colunas={colFiltros} /> : !sb.emBreve ? <FiltrosG colunas={colFiltros} base={baseG} /> : null}
      {pc ? <Recolhivel titulo="ℹ️ Como a nota é calculada" style={st.regras}><RegrasPC pcs={pcs} notas={notas} /></Recolhivel>
        : !sb.emBreve ? <Recolhivel titulo="ℹ️ Como a nota de oferta é calculada" style={st.regras}><RegrasG refs={ofertas.ref} /></Recolhivel> : null}
      <View style={{padding: 12, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6}} testID="listaNotes">
        {sb.emBreve ? <T style={st.vazio}>{sb.icone} {sb.nome} — em breve. A estrutura do card já está pronta; falta escolher quais produtos buscar.</T>
          : !itens.length ? <T style={st.vazio}>{pc ? 'Nenhum computador com esses filtros. Clique em "Limpar filtros".'
            : `Nenhuma oferta com esses filtros${lista!.total.length ? '. Clique em "Limpar filtros" (ou desmarque "Só originais").' : ' ainda. Toque em ⟳ para buscar nas lojas.'}`}</T>
          : itens.map(n => (
            <View key={n.id} style={{width: grade === 2 && !expandidos.has(n.id) ? '50%' : '100%', paddingHorizontal: 6}}>
              {pc ? <CardPC n={n} r={notas.get(n.id)} usaPreco={filtros.fCB} {...props(n)} />
                : <CardG n={n} r={ofertas.notas.get(n.id)} nc={cuponsDaLoja(dados.cupons, n).length} mc={melhorComCupom(dados.cupons, n)} {...props(n)} />}
            </View>
          ))}
        {lista && lista.faltam > 0 ? (
          <View style={st.mais}>
            <Botao tipo="contorno" titulo={`Mostrar mais ${Math.min(POR_PAGINA, lista.faltam)}`} onPress={() => setLimite(limite + POR_PAGINA)} style={{minWidth: 220}} />
            <Meta>Mostrando {lista.mostrados.length} de {lista.resto}</Meta>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  h2: {paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: C.borda},
  filtros: {paddingVertical: 9, paddingHorizontal: 11, borderBottomWidth: 1, borderColor: C.borda, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.18)'},
  regras: {marginTop: 12, marginHorizontal: 14},
  note: {position: 'relative', borderRadius: RAIO, paddingTop: 14, paddingBottom: 14, paddingLeft: 15, paddingRight: 52, marginBottom: 12},
  redondo: {position: 'absolute', right: 10, width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.bordaForte, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', zIndex: 2},
  tags: {flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 7},
  lojaTag: {backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, marginRight: 2},
  linhaTag: {fontSize: 10.9, color: C.dellEsc, textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 1},
  h3: {fontSize: 15.2, lineHeight: 20.5, marginTop: 4, marginBottom: 6},
  resumo: {fontSize: 12.6, color: C.sub, lineHeight: 18.3},
  preco: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8},
  expandido: {marginTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.bordaForte, paddingTop: 12},
  vazio: {color: C.sub, textAlign: 'center', paddingVertical: 34, paddingHorizontal: 16, fontSize: 14.4, width: '100%'},
  mais: {width: '100%', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 16},
});
