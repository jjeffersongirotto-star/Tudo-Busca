/** 🔥 Destaques: ofertas bem abaixo do preço de produtos semelhantes (de tudo ao abrir; da seção escolhida depois). */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { T, Foto } from './base';
import { C, RAIO_P } from './tema';
import { useApp } from './estado';
import { noEscopo, selecaoDe, DESTAQUE } from '@/logica/destaques';
import { precoComCupom } from '@/logica/cupons';
import { secaoAtual, subAtual } from '@/logica/secoes';
import { reais } from '@/logica/formato';

export function Destaques({ margem, aoSelecionar }: { margem: number; aoSelecionar: (id: string) => void }) {
  const {destaques, escolheu, sel, escolher, dados} = useApp();
  const lista = useMemo(() => destaques.filter(d => noEscopo(d.n, escolheu ? sel : null)).slice(0, DESTAQUE.quantos),
    [destaques, escolheu, sel]);
  if (!lista.length) return null;
  const onde = !escolheu ? 'de tudo' : sel.secao === 'computadores'
    ? (sel.sub === 'acessorios' ? 'em peças e acessórios' : 'em computadores')
    : `em ${secaoAtual(sel).nome} › ${subAtual(sel).nome}`;
  return (
    <View style={[st.caixa, {marginHorizontal: margem}]} testID="destaques">
      <T peso="extra" style={{fontSize: 15.5}}>🔥 Destaques <T style={{fontSize: 12.3, color: C.sub}}>{onde} · bem abaixo do preço de semelhantes</T></T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 2}}>
        {lista.map(({n, pct, tipico}) => {
          const pc = n.precoNum ? precoComCupom(dados.cupons, n).melhor : null;
          return (
            <Pressable key={n.id} testID="destaque" accessibilityRole="button" accessibilityLabel={`Ver ${n.nome}`}
              onPress={() => { escolher(selecaoDe(n)); aoSelecionar(n.id); }}
              style={({pressed}) => [st.card, pressed && {opacity: 0.8}]}>
              <View style={{flexDirection: 'row', gap: 9, alignItems: 'center'}}>
                <Foto url={n.imagem} nome={n.nome} tam={52} />
                <View style={st.selo}><T peso="extra" style={{color: '#fff', fontSize: 13}}>-{pct}%</T></View>
              </View>
              <T style={{fontSize: 11.5, color: C.sub}} numberOfLines={1}>{n.loja}{n.modelo ? ` · ${n.modelo}` : ''}</T>
              <T peso="negrito" style={{fontSize: 12.8, lineHeight: 16.5}} numberOfLines={2}>{n.nome}</T>
              <T peso="extra" style={{fontSize: 16}}>{reais(n.precoNum)}</T>
              {pc?.a.estimado != null ? <T style={{fontSize: 11.8, color: '#4ade80'}}>~{reais(pc.a.estimado)} com {pc.c.codigo}</T> : null}
              <T style={{fontSize: 11.3, color: C.fraco}}>típico dos semelhantes: {reais(tipico)}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  caixa: {marginTop: 12, gap: 8, padding: 12, borderRadius: RAIO_P, borderWidth: 1, borderColor: 'rgba(249,115,22,0.35)', backgroundColor: 'rgba(249,115,22,0.06)'},
  card: {width: 196, gap: 4, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.borda, backgroundColor: C.card},
  selo: {backgroundColor: '#ea580c', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, alignItems: 'center', justifyContent: 'center'},
});
