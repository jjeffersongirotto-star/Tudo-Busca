/** 🔥 Destaques: ofertas bem abaixo do preço de produtos semelhantes (de tudo ao abrir; da seção escolhida depois). */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { T, Foto, Icone } from './base';
import { C, RAIO_P } from './tema';
import { useApp } from './estado';
import { noEscopo, selecaoDe, DESTAQUE } from '@/logica/destaques';
import { precoComCupom } from '@/logica/cupons';
import { secaoAtual, subAtual } from '@/logica/secoes';
import { reais } from '@/logica/formato';

export function Destaques({ margem, aoSelecionar }: { margem: number; aoSelecionar: (id: string) => void }) {
  const {destaques, escolheu, sel, escolher, dados} = useApp();
  const {width} = useWindowDimensions();
  const [grade, setGrade] = useState(false);   // ⤢ ampliar: grade com mais ofertas e cards maiores
  const todos = useMemo(() => destaques.filter(d => noEscopo(d.n, escolheu ? sel : null)), [destaques, escolheu, sel]);
  if (!todos.length) return null;
  const lista = todos.slice(0, grade ? DESTAQUE.quantosGrade : DESTAQUE.quantos);
  const onde = !escolheu ? 'de tudo' : sel.secao === 'computadores'
    ? (sel.sub === 'acessorios' ? 'em peças e acessórios' : 'em computadores')
    : `em ${secaoAtual(sel).nome} › ${subAtual(sel).nome}`;
  // grade: 2 colunas no celular, mais em telas largas (cards de ~230 px)
  const util = width - 2 * margem - 24 - 4;   // padding (12+12) e bordas da caixa
  const colunas = Math.max(2, Math.min(5, Math.floor((util + 10) / 240)));
  const larguraGrade = Math.floor((util - 10 * (colunas - 1)) / colunas);
  const card = (d: typeof lista[number]) => {
    const {n, pct, tipico} = d;
    const pc = n.precoNum ? precoComCupom(dados.cupons, n).melhor : null;
    const g = grade;
    return (
      <Pressable key={n.id} testID="destaque" accessibilityRole="button" accessibilityLabel={`Ver ${n.nome}`}
        onPress={() => { escolher(selecaoDe(n)); aoSelecionar(n.id); }}
        style={({pressed}) => [st.card, g && {width: larguraGrade}, pressed && {opacity: 0.8}]}>
        <View style={{flexDirection: 'row', gap: 9, alignItems: 'center'}}>
          <Foto url={n.imagem} nome={n.nome} tam={g ? Math.min(96, larguraGrade - 80) : 52} />
          <View style={st.selo}><T peso="extra" style={{color: '#fff', fontSize: g ? 14.5 : 13}}>-{pct}%</T></View>
        </View>
        <T style={{fontSize: 11.5, color: C.sub}} numberOfLines={1}>{n.loja}{n.modelo ? ` · ${n.modelo}` : ''}</T>
        {n.kit ? <T peso="negrito" style={{fontSize: 11.3, color: '#fdba74'}}>🎁 kit: vem com jogo ou item extra</T> : null}
        <T peso="negrito" style={{fontSize: g ? 13.4 : 12.8, lineHeight: g ? 17.5 : 16.5}} numberOfLines={g ? 3 : 2}>{n.nome}</T>
        <T peso="extra" style={{fontSize: g ? 17.5 : 16}}>{reais(n.precoNum)}</T>
        {pc?.a.estimado != null ? <T style={{fontSize: 11.8, color: '#4ade80'}}>~{reais(pc.a.estimado)} com {pc.c.codigo}</T> : null}
        <T style={{fontSize: 11.3, color: C.fraco}}>típico dos semelhantes: {reais(tipico)}</T>
      </Pressable>
    );
  };
  return (
    <View style={[st.caixa, {marginHorizontal: margem}]} testID="destaques">
      <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 8}}>
        <T peso="extra" style={{fontSize: 15.5, flex: 1}}>🔥 Destaques <T style={{fontSize: 12.3, color: C.sub}}>{onde} · bem abaixo do preço de semelhantes</T></T>
        <Pressable onPress={() => setGrade(!grade)} accessibilityRole="button" testID="btnGradeDestaques"
          accessibilityLabel={grade ? 'Recolher destaques' : 'Ampliar destaques em grade'} style={st.btnGrade} hitSlop={6}>
          {Icone.ampliar(grade, '#fdba74')}
          <T peso="negrito" style={{color: '#fdba74', fontSize: 12.3}}>{grade ? 'Recolher' : 'Ampliar'}</T>
        </Pressable>
      </View>
      {grade
        ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>{lista.map(card)}</View>
        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 2}}>{lista.map(card)}</ScrollView>}
      {grade && todos.length > lista.length ? <T style={{fontSize: 11.8, color: C.fraco}}>mostrando os {lista.length} maiores descontos de {todos.length}</T> : null}
    </View>
  );
}

const st = StyleSheet.create({
  caixa: {marginTop: 12, gap: 8, padding: 12, borderRadius: RAIO_P, borderWidth: 1, borderColor: 'rgba(249,115,22,0.35)', backgroundColor: 'rgba(249,115,22,0.06)'},
  card: {width: 196, gap: 4, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.borda, backgroundColor: C.card},
  btnGrade: {flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(249,115,22,0.45)', backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11,
    alignItems: 'center', justifyContent: 'center'},
  selo: {backgroundColor: '#ea580c', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, alignItems: 'center', justifyContent: 'center'},
});
