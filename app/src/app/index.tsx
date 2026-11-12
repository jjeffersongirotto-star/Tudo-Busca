/** Tela única: topo, cards de seleção e 3 colunas (cupons · produtos · especificações). */
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Topo, AvisoTopo, DicaVersao, Secoes, Rodape } from '@/ui/topo';
import { ColunaCupons } from '@/ui/colunaCupons';
import { ColunaLista } from '@/ui/lista';
import { PainelDetalhes } from '@/ui/detalhes';
import { T } from '@/ui/base';
import { useApp } from '@/ui/estado';
import { C, RAIO, ehWeb, sombra } from '@/ui/tema';

function Coluna({ titulo, children, altura, style, onLayout, testID }: { titulo?: string; children: React.ReactNode; altura?: number; style?: object; onLayout?: (e: LayoutChangeEvent) => void; testID?: string }) {
  return (
    <View style={[st.coluna, altura ? {maxHeight: altura} : null, style]} onLayout={onLayout} testID={testID}>
      {titulo ? <View style={st.h2}><T peso="extra" style={{fontSize: 16}}>{titulo}</T></View> : null}
      {altura ? <ScrollView style={{flexGrow: 0}} nestedScrollEnabled>{children}</ScrollView> : children}
    </View>
  );
}

export default function Inicio() {
  const {width, height} = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const {cuponsAbertos, setSelecionadoId} = useApp();
  const larga = width > 1100;
  const margem = width <= 500 ? 10 : 22;
  const pagina = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const yDetalhes = useRef(0);
  const refDetalhes = useRef<React.ComponentRef<typeof View>>(null);
  const [larguraMeio, setLarguraMeio] = useState(600);

  const aoSelecionar = useCallback((id: string) => {
    setSelecionadoId(id);
    if (larga) return;
    setTimeout(() => {
      const el = refDetalhes.current as unknown as {scrollIntoView?: (o: object) => void} | null;
      if (ehWeb && el?.scrollIntoView) el.scrollIntoView({behavior: 'smooth', block: 'start'});
      else pagina.current?.scrollTo({y: Math.max(0, yDetalhes.current - 8), animated: true});
    }, 50);
  }, [larga, setSelecionadoId]);

  const altura = larga ? height - 110 : undefined;
  const fr = cuponsAbertos ? [1, 1.7, 1.05] : [0, 2, 1.05];
  const colunas = larga ? (
    <View style={[st.main, {paddingHorizontal: margem}]}>
      <Coluna altura={altura} style={cuponsAbertos ? {flex: fr[0]} : {width: 240}} testID="colCupons"><ColunaCupons larga aberta={cuponsAbertos} /></Coluna>
      <Coluna altura={altura} style={{flex: fr[1]}} onLayout={e => setLarguraMeio(e.nativeEvent.layout.width)} testID="colLista"><ColunaLista largura={larguraMeio} aoSelecionar={aoSelecionar} /></Coluna>
      <Coluna altura={altura} style={{flex: fr[2]}} titulo="📋 Especificações" testID="colDetalhes"><PainelDetalhes /></Coluna>
    </View>
  ) : null;

  return (
    <ScrollView ref={pagina} style={{flex: 1, backgroundColor: ehWeb ? 'transparent' : C.bg}} contentContainerStyle={{paddingTop: ins.top, paddingBottom: ins.bottom}}
      stickyHeaderIndices={[0]} keyboardShouldPersistTaps="handled">
      <Topo />
      <AvisoTopo margem={margem} />
      <DicaVersao margem={margem} />
      <Secoes margem={margem} />
      {larga ? colunas : null}
      {!larga ? <View style={{marginHorizontal: margem, marginTop: 12}}><Coluna testID="colCupons"><ColunaCupons larga={false} aberta /></Coluna></View> : null}
      {!larga ? <View style={{marginHorizontal: margem, marginTop: 12}} onLayout={e => setLarguraMeio(e.nativeEvent.layout.width)}><Coluna testID="colLista"><ColunaLista largura={larguraMeio} aoSelecionar={aoSelecionar} /></Coluna></View> : null}
      {!larga ? <View ref={refDetalhes} style={{marginHorizontal: margem, marginTop: 12, scrollMarginTop: 80} as object} onLayout={e => { yDetalhes.current = e.nativeEvent.layout.y; }}><Coluna titulo="📋 Especificações" testID="colDetalhes"><PainelDetalhes /></Coluna></View> : null}
      <Rodape />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  main: {flexDirection: 'row', gap: 18, paddingVertical: 18, alignItems: 'flex-start'},
  coluna: {backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: RAIO, overflow: 'hidden', minHeight: 300, ...sombra},
  h2: {paddingVertical: 15, paddingHorizontal: 18, borderBottomWidth: 1, borderColor: C.borda},
});
