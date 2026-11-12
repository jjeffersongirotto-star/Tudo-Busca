/** Coluna de cupons: segue o card selecionado (lojas e categorias), com filtros, copiar código e "mostrar mais". */
import { useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { T, Meta, Tag, Botao, Select, Check, Link, Grad, abrir } from './base';
import { C, F, RAIO_P } from './tema';
import { useApp } from './estado';
import { listaCupons, lojasSemCupom, catCupom, minimoCupom, lojaDoCupom, OPCOES_CAT_CUPOM } from '@/logica/cupons';
import { reais, ni } from '@/logica/formato';
import type { Cupom } from '@/logica/tipos';

function BotaoCopiar({ codigo }: { codigo: string }) {
  const {copiar} = useApp();
  const [estado, setEstado] = useState<'' | 'ok' | 'erro'>('');
  const clicar = async () => { setEstado(await copiar(codigo) ? 'ok' : 'erro'); setTimeout(() => setEstado(''), 1800); };
  return (
    <Pressable onPress={clicar} accessibilityRole="button" accessibilityLabel={'Copiar ' + codigo} style={{alignSelf: 'flex-start', marginTop: 9}}>
      {estado === 'ok' ? <View style={[st.copiar, {backgroundColor: C.ok}]}><T peso="negrito" style={st.txtBtn}>✔ Copiado!</T></View>
        : <Grad style={st.copiar}><T peso="negrito" style={st.txtBtn}>{estado === 'erro' ? 'Erro ao copiar' : '📋 Copiar'}</T></Grad>}
    </Pressable>
  );
}

function CartaoCupom({ c, rotuloEscopo, novo }: { c: Cupom; rotuloEscopo: string; novo: boolean }) {
  const min = minimoCupom(c);
  return (
    <View style={[st.cupom, c.ativo === false && {opacity: 0.55}]} testID="cupom">
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
        <View style={st.codigo}><T style={st.txtCodigo} selectable testID="codigoCupom">{c.codigo || 'Sem código público'}</T></View>
        <Grad style={st.descTag}><T peso="extra" style={{color: '#fff', fontSize: 11.8}}>{ni(c.desconto)}</T></Grad>
      </View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8, gap: 4}}>
        <View style={st.lojaTag}><T peso="negrito" style={{fontSize: 10.9}}>{lojaDoCupom(c)}</T></View>
        <T style={st.cat}>{catCupom(c)}{rotuloEscopo ? ' · ' + rotuloEscopo : ''}</T>
        {novo ? <Tag grad={['#f97316', '#ec4899']} cor="#fff">NOVO</Tag> : null}
      </View>
      <T style={{fontSize: 13.9, lineHeight: 20, marginVertical: 7}}>{ni(c.descricao)}</T>
      {c.validade && !/n[aã]o\s+informad/i.test(c.validade) ? <Meta>📅 Validade: {c.validade}</Meta> : null}
      {min ? <Meta>💰 Compra mínima: {reais(min)}</Meta> : null}
      {c.regras ? <Meta>📜 Regras: {c.regras}</Meta> : null}
      <Meta>⚠️ Condições: {ni(c.condicoes)}</Meta>
      <Meta>🔗 Fonte: {c.fonteUrl ? <Link url={c.fonteUrl} style={{fontSize: 12.3}}>{c.fonte || c.fonteUrl}</Link> : ni(c.fonte)}</Meta>
      {c.status ? <Meta>🚦 Situação: {c.status}</Meta> : null}
      {(c.fontesExtras || []).length ? <Meta>📎 Termos vistos em: {c.fontesExtras!.map((f, i) => <T key={i}>{i ? ' · ' : ''}<Link url={f.url} style={{fontSize: 12.3}}>{f.nome}</Link></T>)}</Meta> : null}
      {c.codigo ? <BotaoCopiar codigo={c.codigo} />
        : <Botao tipo="contorno" titulo="Resgatar no site da loja" onPress={() => abrir(c.fonteUrl)} style={{alignSelf: 'flex-start', marginTop: 9}} />}
    </View>
  );
}

export function ColunaCupons({ larga, aberta }: { larga: boolean; aberta: boolean }) {
  const {dados, ctxCupons, sel, filtrosCupom: f, setFiltrosCupom, limiteCupons, setLimiteCupons, novos, prodSel, setCuponsAbertos} = useApp();
  const r = useMemo(() => listaCupons(dados.cupons, ctxCupons, {secao: ctxCupons.secao.id, item: sel.item || ''}, f), [dados.cupons, ctxCupons, sel.item, f]);
  const {lojasProd, semCupom} = useMemo(() => lojasSemCupom(dados.cupons, ctxCupons, prodSel), [dados.cupons, ctxCupons, prodSel]);
  const visiveis = r.visiveis.slice(0, limiteCupons);
  const cats = Object.entries(ctxCupons.pesos).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const rotulo = (c: Cupom) => f.todos ? '' : ({item: 'vale para ' + ctxCupons.nome, geral: 'geral da loja', selecao: 'itens selecionados'} as Record<string, string>)[r.escopo(c).tipo] || '';
  const mostrar = aberta || !larga;
  return (
    <View style={{flex: 1, minHeight: 0}}>
      <View style={st.h2}>
        <T peso="extra" style={{fontSize: 16, flexShrink: 1}}>🏷️ Cupons <T peso="semi" style={{fontSize: 12, color: C.sub}} testID="contCupons">
          {`${r.ativos} ativos ${f.todos ? 'no total' : 'p/ ' + ctxCupons.nome}` + (r.visiveis.length !== r.ativos ? ` · ${r.visiveis.length} exibidos` : '')}</T></T>
        {larga ? <Pressable onPress={() => setCuponsAbertos(!aberta)} style={st.toggle} accessibilityRole="button" accessibilityState={{expanded: aberta}} testID="btnCupons">
          <T peso="negrito" style={{color: C.dellEsc, fontSize: 11.8}}>{aberta ? '◂ Recolher' : 'Expandir ▸'}</T></Pressable> : null}
      </View>
      {mostrar ? (
        <>
          <View style={st.contexto} testID="cupomContexto">
            {f.todos ? <T style={st.txtContexto}>Mostrando <T peso="negrito" style={st.txtContexto2}>todos os cupons</T>, de qualquer loja e categoria.</T> : (
              <T style={st.txtContexto}>Cupons para <T peso="negrito" style={st.txtContexto2}>{ctxCupons.nome}</T>: lojas onde há ofertas dessa seleção
                {lojasProd.length ? ` (${lojasProd.slice(0, 8).join(', ')}${lojasProd.length > 8 ? '…' : ''})` : ''} e lojas que vendem esse tipo de produto; tipos: {cats.join(', ')}.
                {semCupom.length ? `\nSem cupom com código público agora: ${semCupom.slice(0, 6).join(', ')}${semCupom.length > 6 ? '…' : ''}.` : ''}</T>
            )}
          </View>
          <View style={st.filtro}>
            <Select rotulo="Loja" compacto valor={r.loja} opcoes={[['', 'Todas'], ...r.lojas.map(l => [l, l] as const)]} aoMudar={v => setFiltrosCupom({loja: v})} style={{flexGrow: 1, flexBasis: 130}} />
            <Select rotulo="Tipo" compacto valor={f.cat} opcoes={OPCOES_CAT_CUPOM} aoMudar={v => setFiltrosCupom({cat: v})} style={{flexGrow: 1, flexBasis: 130}} />
            <Check rotulo="mostrar expirados/duvidosos" valor={f.velhos} aoMudar={v => setFiltrosCupom({velhos: v})} />
            <Check rotulo="todos os cupons (qualquer loja/categoria)" valor={f.todos} aoMudar={v => setFiltrosCupom({todos: v})} />
          </View>
          <View style={{padding: 12}} testID="listaCupons">
            {visiveis.length ? visiveis.map((c, i) => <CartaoCupom key={c.id + '|' + i} c={c} rotuloEscopo={rotulo(c)} novo={novos.has('c:' + c.id)} />)
              : <T style={st.vazio}>Nenhum cupom com esses filtros{f.todos ? '' : ' para ' + ctxCupons.nome + '. Marque "todos os cupons" para ver os das outras categorias'}.</T>}
            {r.visiveis.length > visiveis.length ? (
              <View style={st.mais}>
                <Botao tipo="contorno" titulo={`Mostrar mais ${Math.min(50, r.visiveis.length - visiveis.length)}`} onPress={() => setLimiteCupons(limiteCupons + 50)} style={{minWidth: 220}} />
                <Meta>Mostrando {visiveis.length} de {r.visiveis.length}</Meta>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

export const st = StyleSheet.create({
  h2: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: C.borda},
  toggle: {backgroundColor: 'rgba(139,92,246,0.14)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11},
  contexto: {marginTop: 10, marginHorizontal: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)', backgroundColor: 'rgba(34,211,238,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11},
  txtContexto: {fontSize: 12.5, lineHeight: 18.7, color: C.sub},
  txtContexto2: {fontSize: 12.5, color: C.txt},
  filtro: {paddingTop: 12, paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end'},
  cupom: {borderWidth: 1, borderStyle: 'dashed', borderColor: C.bordaForte, borderRadius: RAIO_P, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.025)'},
  codigo: {backgroundColor: 'rgba(34,211,238,0.10)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(34,211,238,0.5)', flexShrink: 1},
  txtCodigo: {fontFamily: F.mono, fontSize: 15.7, letterSpacing: 0.6, color: '#a5f3fc'},
  descTag: {paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999},
  lojaTag: {backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, marginRight: 2},
  cat: {fontSize: 11.2, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6},
  copiar: {borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16},
  txtBtn: {color: '#fff', fontSize: 13.8},
  vazio: {color: C.sub, textAlign: 'center', paddingVertical: 34, paddingHorizontal: 16, fontSize: 14.4},
  mais: {alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 16},
});
