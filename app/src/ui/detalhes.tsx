/** Informações completas de um produto (painel da direita e card aberto) + cupons da loja que podem valer. */
import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { T, Meta, Tag, Botao, Foto, Recolhivel, abrir } from './base';
import { C, COR_CAT, COR_PERFIL, RAIO_P } from './tema';
import { useApp } from './estado';
import type { Produto } from '@/logica/tipos';
import { CATEGORIAS, rotuloParte, pontuar, P_HW, P_PRECO, type Pontuacao } from '@/logica/nota';
import { CLASSE_PERFIL, ICONE_TIPO } from '@/logica/filtros';
import { OFERTA, grupoG } from '@/logica/ofertas';
import { cuponsDaLoja, cuponsForaDaLoja, lojaCupomDe, ROTULO_ESCOPO, type CupomDoProduto } from '@/logica/cupons';
import { SECOES, secaoDe } from '@/logica/secoes';
import { fmt1, fmtPct, reais, ni } from '@/logica/formato';

export function TagCat({ cat, prefixo = '' }: { cat?: string; prefixo?: string }) {
  const i = CATEGORIAS.indexOf(cat as never), cor = COR_CAT[i] ?? '#475569';
  return typeof cor === 'string' ? <Tag fundo={cor} cor="#fff">{prefixo}{cat}</Tag> : <Tag grad={cor} cor="#fff">{prefixo}{cat}</Tag>;
}
export function TagPerfil({ n, prefixo = '' }: { n: Produto; prefixo?: string }) {
  const [f, c] = COR_PERFIL[CLASSE_PERFIL[n.cpuPerfil || ''] || 'NI'];
  return CLASSE_PERFIL[n.cpuPerfil || ''] === 'HX' ? <Tag grad={['#dc2626', '#db2777']} cor="#fff">⚙️ {prefixo}{n.cpuPerfil}</Tag> : <Tag fundo={f} cor={c}>⚙️ {prefixo}{n.cpuPerfil || 'Não informado'}</Tag>;
}
export function BadgeDesc({ n }: { n: Produto }) {
  if (n.descontoPct == null || n.descontoPct <= 0) return null;
  const forte = n.descontoPct >= 20;
  return forte ? <Tag grad={['#f97316', '#ec4899']} cor="#fff">🔥 -{fmtPct(n.descontoPct)}</Tag> : <Tag fundo="rgba(251,146,60,0.16)" cor="#fdba74">-{fmtPct(n.descontoPct)}</Tag>;
}
const Linha = ({ k, v, est }: { k: string; v: React.ReactNode; est?: boolean }) => (
  <View style={[st.tr, est && {backgroundColor: 'rgba(250,204,21,0.08)'}]}>
    <T peso="semi" style={st.th}>{k}</T>
    <View style={st.td}>{typeof v === 'string' ? <T style={{fontSize: 13.3}} selectable>{v}</T> : v}</View>
  </View>
);

function CodigoCopiavel({ codigo }: { codigo?: string }) {
  const {copiar} = useApp();
  const [ok, setOk] = useState(false);
  return (
    <Pressable onPress={async () => { if (await copiar(codigo)) { setOk(true); setTimeout(() => setOk(false), 1500); } }} accessibilityRole="button" accessibilityLabel={'Copiar ' + codigo} style={st.codigo}>
      <T peso="negrito" style={{fontSize: 12.8, color: '#a5f3fc', fontFamily: 'JetBrainsMono_700Bold'}}>{ok ? '✔ copiado' : codigo}</T>
    </Pressable>
  );
}

function LinhaCupom({ x, n }: { x: CupomDoProduto; n: Produto }) {
  const {c, a, e} = x;
  const rot = ROTULO_ESCOPO[e.tipo as 'item' | 'geral' | 'selecao'];
  const corTag: Record<string, [string, string]> = {orig: ['rgba(34,197,94,0.14)', '#86efac'], velho: ['rgba(251,146,60,0.14)', '#fdba74'], '': ['rgba(255,255,255,0.07)', '#d4d4e0']};
  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginVertical: 5}} testID="cupomProduto">
      <CodigoCopiavel codigo={c.codigo} />
      <Tag grad={['#8b5cf6', '#22d3ee']} cor="#fff">{ni(c.desconto)}</Tag>
      <Tag fundo={corTag[rot[0]][0]} cor={corTag[rot[0]][1]}>{rot[1]}</Tag>
      <T style={{fontSize: 12.8, flexShrink: 1}}>{c.descricao || ''}</T>
      <Meta style={{width: '100%'}}>
        {a.min == null ? 'Compra mínima: não informada' : a.atinge ? `✔ atinge a compra mínima de ${reais(a.min)}` : `✖ compra mínima de ${reais(a.min)} — faltam ${reais(a.min - (n.precoNum || 0))}`}
        {a.estimado != null ? <T peso="extra" style={{fontSize: 12.3}}> · preço estimado com o cupom: {reais(a.estimado)}</T> : null}
        {a.aviso ? ' · ' + a.aviso : ''}{e.tipo === 'selecao' ? ' · ' + e.motivo : ''}{c.regras ? '\nRegras: ' + c.regras : ''}
      </Meta>
    </View>
  );
}

export function CuponsProduto({ n }: { n: Produto }) {
  const {dados} = useApp();
  const lista = cuponsDaLoja(dados.cupons, n), fora = cuponsForaDaLoja(dados.cupons, n);
  const sec = SECOES.find(x => x.id === secaoDe(n)) || SECOES[0];
  const prim = lista.slice(0, 8), resto = lista.slice(8);
  return (
    <View style={st.mini} testID="miniCupons">
      <T peso="extra" style={{fontSize: 14, marginBottom: 6}} testID="tituloMiniCupons">🏷️ Cupons da {lojaCupomDe(n) || n.loja} que podem valer ({lista.length})</T>
      {lista.length ? <>
        {prim.map(x => <LinhaCupom key={x.c.id} x={x} n={n} />)}
        {resto.length ? <Recolhivel titulo={`mais ${resto.length} cupons`} style={{marginVertical: 4}}>{resto.map(x => <LinhaCupom key={x.c.id} x={x} n={n} />)}</Recolhivel> : null}
        <Meta>Ordem: cupons do item → gerais da loja (valem para qualquer produto, respeitando a compra mínima) → de itens selecionados (confira). Preço estimado = preço do anúncio − desconto do cupom; confira no carrinho. Toque no código para copiar.</Meta>
      </> : <Meta>Nenhum cupom com código público dessa loja que valha para {sec.nome.toLowerCase()} ou para a loja toda.</Meta>}
      {fora ? <Meta>{fora} outro(s) cupom(ns) da loja são de outras categorias, produtos ou marcas e não valem para este item.</Meta> : null}
    </View>
  );
}

function BotaoLoja({ n }: { n: Produto }) {
  return n.url ? <Botao titulo={`Ver na ${n.loja || 'Dell.com'} ↗`} onPress={() => abrir(n.url)} style={{marginTop: 12}} />
    : <T style={st.vazio}>Link do produto não informado.</T>;
}

export function InfoPC({ n, noCard }: { n: Produto; noCard?: boolean }) {
  const {notas, melhorCb, filtros} = useApp();
  const usaPreco = filtros.fCB;
  const r: Pontuacao = notas.get(n.id) || pontuar(n);
  const fp = (n.specs || {})['Fonte do preço'];
  return (
    <View testID="infoPC">
      {noCard ? null : <Foto url={n.imagem} nome={n.nome} grande tam={230} />}
      <T peso="negrito" style={st.linhaTag}>{ICONE_TIPO[n.tipo || ''] || '💻'} {n.tipo || 'Notebook'} · {n.marca || ''}{n.linha && n.linha !== n.marca ? ' · ' + n.linha : ''}</T>
      <T peso="extra" style={st.h3} selectable>{n.nome}</T>
      <Meta>Loja: <T peso="extra" style={{fontSize: 12.3}}>{n.loja || 'Dell.com'}</T>{n.vendedor ? ' · Vendedor: ' + n.vendedor : ''} · Modelo: {ni(n.modelo)} · Código: {n.id}</Meta>
      <View style={st.precoGrande}><T peso="extra" style={st.valor}>{n.preco || 'Preço não informado'}</T><BadgeDesc n={n} /></View>
      {n.precoDe ? <Meta>De <T style={{textDecorationLine: 'line-through', fontSize: 12.3, color: C.sub}}>{n.precoDe}</T> → desconto de {n.descontoPct != null ? fmtPct(n.descontoPct) : '?'} (De − Por) ÷ De · só informativo, não entra na nota</Meta>
        : <Meta>A loja não mostra preço &quot;De&quot; → desconto não calculado.</Meta>}
      {n.precoPrazo ? <Meta>A prazo: {n.precoPrazo}</Meta> : null}
      {n.precoAntigo ? <Meta style={{color: '#fdba74', fontFamily: 'PlusJakartaSans_600SemiBold'}}>⚠ {String(fp || 'Preço de coleta anterior; pode ter mudado.')}</Meta> : null}
      <View style={st.tags}>
        <TagCat cat={r.cat} prefixo="Categoria: " />
        {(n.doBanco || []).length ? <Tag fundo="rgba(34,211,238,0.12)" cor="#a5f3fc">🗄️ completado pelo banco: {n.doBanco!.join(', ')}</Tag> : null}
        <TagPerfil n={n} prefixo="Perfil: " />
        {n.pesoKg ? <Tag>⚖️ {String(n.pesoKg).replace('.', ',')} kg</Tag> : null}
      </View>
      <View style={st.notaBox}>
        <T peso="extra" style={{fontSize: 14.7, marginBottom: 6}} testID="notaTitulo">Desempenho: {fmt1(r.total)}/100{usaPreco ? ` · Custo-benefício: ${r.cbFinal == null ? 'sem preço' : fmt1(r.cbFinal) + '/100'}` : ''}</T>
        <View style={[st.tr, {backgroundColor: 'rgba(255,255,255,0.035)'}]}>
          <T peso="semi" style={[st.th, {width: undefined, flex: 0.9}]}>Item</T><T peso="semi" style={[st.th, {width: undefined, flex: 2}]}>Valor considerado</T><T peso="semi" style={[st.th, {width: undefined, flex: 0.8}]}>Pontos</T>
        </View>
        {r.itens.map(x => (
          <View key={x.k} style={[st.tr, x.estimado && {backgroundColor: 'rgba(250,204,21,0.08)'}]} testID={x.estimado ? 'linhaEstimada' : undefined}>
            <T style={[st.tdTxt, {flex: 0.9}]}>{x.k}</T>
            <View style={{flex: 2, padding: 8}}>
              <T style={{fontSize: 13.3}}>{x.v}</T>
              {x.obs ? <Meta>{x.obs}</Meta> : null}
              {x.estimado ? <Meta style={{color: '#fde68a'}}>⚠ estimado – {x.partesEst.map(rotuloParte).join(', ')}: valor típico da categoria {r.cat} (não está no anúncio nem no banco de dados)</Meta> : null}
            </View>
            <T style={[st.tdTxt, {flex: 0.8}]}>{fmt1(x.p)}/{x.m}</T>
          </View>
        ))}
        <View style={st.tr}>
          <T peso="semi" style={[st.tdTxt, {flex: 0.9, color: C.dellEsc}]}>Soma</T>
          <T style={[st.tdTxt, {flex: 2}]}>{fmt1(r.bruto)} de {r.maxBruto} → × 100 ÷ {r.maxBruto}{r.semTela ? ' (sem tela: o item Tela não conta)' : ''}</T>
          <T peso="extra" style={[st.tdTxt, {flex: 0.8}]}>{fmt1(r.total)}/100</T>
        </View>
        <Meta style={{marginTop: 6}}>
          {!usaPreco ? 'O preço não entra no Desempenho. Marque Custo-benefício nos filtros para comparar com o preço.'
            : r.cb != null ? `Custo-benefício = ${P_HW}% Desempenho + ${P_PRECO}% valor pelo preço. Valor pelo preço: ${fmt1(r.total)} ÷ (${n.preco} ÷ 1000) = ${fmt1(r.cb)} pontos por R$ 1.000; o melhor entre os ${(r.grupo || '').toLowerCase()} faz ${fmt1(melhorCb[r.grupo || ''] || 0)} → ${r.cbPct}/100. Conta: ${P_HW}% × ${fmt1(r.total)} + ${P_PRECO}% × ${r.cbPct} = ${fmt1(r.cbFinal!)}/100.`
            : 'Sem preço: custo-benefício não calculado.'}
          {r.estimados.length ? ' Linhas em amarelo = dado não informado pela loja; usam o computador típico da categoria.' : ''}
        </Meta>
      </View>
      <View style={st.tabela}>
        <Linha k="Sistema operacional" v={ni(n.sistema)} />
        {Object.entries(n.specs || {}).map(([k, v]) => <Linha key={k} k={k} v={ni(v)} />)}
      </View>
      <CuponsProduto n={n} />
      <BotaoLoja n={n} />
    </View>
  );
}

export function InfoG({ n, noCard }: { n: Produto; noCard?: boolean }) {
  const {ofertas} = useApp();
  const r = ofertas.notas.get(n.id) || {nota: null};
  const dataBR = (d?: string) => d ? d.split('-').reverse().join('/') : '';
  const fp = (n.specs || {})['Fonte do preço'];
  return (
    <View testID="infoG">
      {noCard ? null : <Foto url={n.imagem} nome={n.nome} grande tam={230} />}
      <T peso="negrito" style={st.linhaTag}>🎮 {n.tipo || ''} · {n.marca || ''} · {n.modelo || ''}</T>
      <T peso="extra" style={st.h3} selectable>{n.nome}</T>
      <Meta>Loja: <T peso="extra" style={{fontSize: 12.3}}>{n.loja}</T>{n.vendedor ? ' · Vendedor: ' + n.vendedor : ''} · Código: {n.id}</Meta>
      <View style={st.precoGrande}><T peso="extra" style={st.valor}>{n.preco || 'Preço não informado'}</T><BadgeDesc n={n} /></View>
      {n.precoDe ? <Meta>De <T style={{textDecorationLine: 'line-through', fontSize: 12.3, color: C.sub}}>{n.precoDe}</T> → desconto de {n.descontoPct != null ? fmtPct(n.descontoPct) : '?'} segundo a loja (só informativo).</Meta> : null}
      {n.precoPrazo ? <Meta>A prazo: {n.precoPrazo}</Meta> : null}
      {n.menorPrecoVisto ? <Meta>📉 Menor preço já visto neste anúncio: <T peso="extra" style={{fontSize: 12.3}}>{reais(n.menorPrecoVisto)}</T> ({dataBR(n.menorPrecoData)})</Meta> : null}
      {n.precoAntigo ? <Meta style={{color: '#fdba74', fontFamily: 'PlusJakartaSans_600SemiBold'}}>⚠ {String(fp || 'Preço de coleta anterior; pode ter mudado.')}</Meta> : null}
      <View style={st.notaBox}>
        <T peso="extra" style={{fontSize: 14.7, marginBottom: 6}} testID="notaTitulo">Oferta: {r.nota == null ? '—' : fmt1(r.nota) + '/100'}</T>
        {r.nota == null || !r.ref || r.pct == null ? <Meta>{r.motivo || 'sem preço'}</Meta> : (
          <Meta>Preço típico do {grupoG(n).split('|')[1]} agora: <T peso="extra" style={{fontSize: 12.3}}>{reais(r.ref.mediana)}</T> (mediana de {r.ref.qtd} anúncios; o menor é {reais(r.ref.min)}).
            Este anúncio está <T peso="extra" style={{fontSize: 12.3}}>{fmt1(Math.abs(r.pct))}% {r.pct >= 0 ? 'abaixo' : 'acima'}</T> → 50 {r.pct >= 0 ? '+' : '−'} {fmt1(Math.abs(r.pct))} × {OFERTA.fator} = {fmt1(r.nota)}.</Meta>
        )}
      </View>
      <CuponsProduto n={n} />
      <View style={st.tabela}>{Object.entries(n.specs || {}).map(([k, v]) => <Linha key={k} k={k} v={ni(v)} />)}</View>
      <BotaoLoja n={n} />
    </View>
  );
}

export function PainelDetalhes() {
  const {produtoSelecionado: n, sel} = useApp();
  return (
    <View style={{paddingVertical: 16, paddingHorizontal: 18}} testID="detalhes">
      {!n ? <T style={st.vazio}>Selecione {sel.secao === 'computadores' ? 'um computador' : 'um produto'} na coluna do meio para ver as especificações completas aqui.</T>
        : n.secao && n.secao !== 'computadores' ? <InfoG n={n} /> : <InfoPC n={n} />}
    </View>
  );
}

export const st = StyleSheet.create({
  linhaTag: {color: C.dellEsc, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6},
  h3: {fontSize: 17.9, lineHeight: 23, marginTop: 2, marginBottom: 6, letterSpacing: -0.2},
  precoGrande: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4},
  valor: {fontSize: 26.4, color: '#c4b5fd', letterSpacing: -0.5},
  tags: {flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 7},
  notaBox: {borderWidth: 1, borderColor: C.borda, borderRadius: RAIO_P, paddingVertical: 11, paddingHorizontal: 13, marginVertical: 12, backgroundColor: 'rgba(0,0,0,0.2)'},
  tabela: {marginVertical: 12},
  tr: {flexDirection: 'row', borderBottomWidth: 1, borderColor: C.borda},
  th: {width: '36%', padding: 8, backgroundColor: 'rgba(255,255,255,0.035)', color: C.dellEsc, fontSize: 13.3},
  td: {flex: 1, padding: 8},
  tdTxt: {padding: 8, fontSize: 13.3},
  mini: {marginVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: C.bordaForte, borderRadius: RAIO_P, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.02)'},
  codigo: {backgroundColor: 'rgba(34,211,238,0.10)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(34,211,238,0.5)', borderRadius: 9, paddingVertical: 2, paddingHorizontal: 7},
  vazio: {color: C.sub, textAlign: 'center', paddingVertical: 34, paddingHorizontal: 16, fontSize: 14.4},
});
