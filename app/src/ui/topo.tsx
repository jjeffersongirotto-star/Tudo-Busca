/** Topo (logo, data, ⟳, instalar), aviso, dica de versão nova e cards de seleção. */
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';
import { T, Grad, Icone, Link, abrir } from './base';
import { C, RAIO, RAIO_P, ehWeb, sombra } from './tema';
import { useApp, NATIVO, type Aviso } from './estado';
import { SECOES, secaoAtual, subAtual, itemAtual, contar } from '@/logica/secoes';
import { versaoCurta } from '@/logica/versao';
import { SERVIDOR_PUBLICO } from '@/dados/api';

const RELEASES = 'https://github.com/jjeffersongirotto-star/Tudo-Busca/releases/latest';

function BotaoAtualizar() {
  const {atualizando, atualizar} = useApp();
  const [giro] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!atualizando) return;
    giro.setValue(0);
    const a = Animated.loop(Animated.timing(giro, {toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: !ehWeb}));
    a.start();
    return () => { a.stop(); Animated.timing(giro, {toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: !ehWeb}).start(); };
  }, [atualizando, giro]);
  const rot = giro.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const icone = <Animated.View style={{transform: [{rotate: rot}]}}>{Icone.atualizar()}</Animated.View>;
  return (
    <Pressable onPress={atualizar} accessibilityRole="button" accessibilityLabel={atualizando ? 'Atualizando…' : 'Atualizar dados'} accessibilityState={{busy: atualizando}}
      testID="btnAtualizar" style={({pressed}) => [{transform: [{scale: pressed ? 0.92 : 1}]}]}>
      {atualizando ? <Grad style={st.refresh}>{icone}</Grad> : <View style={[st.refresh, {backgroundColor: C.cardForte, borderWidth: 1, borderColor: C.bordaForte}]}>{icone}</View>}
    </Pressable>
  );
}

/** Web: instala como app (PWA) quando o navegador oferece; senão, mostra como baixar o APK. No app nativo não aparece. */
function BotaoInstalar({ estreito }: { estreito: boolean }) {
  const {setAviso} = useApp();
  const [pedido, setPedido] = useState<{prompt: () => void} | null>(null);
  useEffect(() => {
    if (!ehWeb || typeof window === 'undefined') return;
    const f = (e: Event) => { e.preventDefault(); setPedido(e as unknown as {prompt: () => void}); };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);
  if (NATIVO) return null;
  const ios = ehWeb && typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const clicar = () => {
    if (pedido) { pedido.prompt(); setPedido(null); return; }
    if (ios) setAviso({tipo: 'info', texto: 'No iPhone/iPad: toque em Compartilhar (quadrado com seta para cima) e depois em Adicionar à Tela de Início.'});
    else setAviso({tipo: 'info', texto: 'Para instalar: no menu do navegador (⋮), escolha "Instalar app" ou "Adicionar à tela inicial". Também há APK para Android e instalador para Windows em Downloads.', detalhe: RELEASES});
  };
  return (
    <Pressable onPress={clicar} accessibilityRole="button" accessibilityLabel="Instalar o app">
      <Grad style={[st.instalar, estreito && {width: 44, paddingHorizontal: 0}]}>{Icone.baixar()}{estreito ? null : <T peso="negrito" style={{color: '#fff', fontSize: 13.8}}>Instalar app</T>}</Grad>
    </Pressable>
  );
}

export function Topo() {
  const {dados} = useApp();
  const {width} = useWindowDimensions();
  const estreito = width <= 500;
  return (
    <View style={[st.header, estreito && {paddingHorizontal: 12, paddingVertical: 10}]}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0}}>
        <Grad style={[st.logo, estreito && {width: 36, height: 36, borderRadius: 11}]}>{Icone.lupa()}</Grad>
        <View style={{flex: 1, minWidth: 0}}>
          <T peso="extra" style={{fontSize: estreito ? 16.3 : 20, letterSpacing: -0.4}} numberOfLines={estreito ? 2 : 1}>
            Buscador de <T peso="extra" style={{fontSize: estreito ? 16.3 : 20, color: C.dell}}>Cupons & Ofertas</T>
          </T>
          <T style={{fontSize: estreito ? 11.5 : 12.5, color: C.sub, marginTop: 2}} numberOfLines={1}>
            Atualizado em <T peso="semi" style={{fontSize: estreito ? 11.5 : 12.5}} testID="ultimaAtualizacao">{dados.ultimaAtualizacaoTexto || dados.ultimaAtualizacao || '—'}</T>
          </T>
        </View>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <BotaoInstalar estreito={estreito} />
        <BotaoAtualizar />
      </View>
    </View>
  );
}

const COR_AVISO: Record<Aviso['tipo'], [string, string, string]> = {
  ok: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.35)', '#bbf7d0'],
  erro: ['rgba(251,146,60,0.12)', 'rgba(251,146,60,0.35)', '#fed7aa'],
  info: ['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.35)', '#ddd6fe'],
  versao: ['rgba(167,139,250,0.12)', '#a78bfa', '#ede9fe'],
};
export function AvisoTopo({ margem }: { margem: number }) {
  const {aviso} = useApp();
  if (!aviso) return null;
  const [fundo, borda, cor] = COR_AVISO[aviso.tipo];
  const ehLink = aviso.detalhe?.startsWith('https://');
  return (
    <View style={[st.aviso, {marginHorizontal: margem, backgroundColor: fundo, borderColor: borda}]} testID="aviso" accessibilityLiveRegion="polite">
      <T style={{color: cor, fontSize: 13.8, lineHeight: 20}}>{aviso.texto}</T>
      {aviso.versao ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 8}}>
          <Pressable onPress={() => abrir(aviso.versao!.link)} style={st.btnVersao} accessibilityRole="link"><T peso="negrito" style={{color: '#fff', fontSize: 15}}>⬇️ Baixar a versão nova</T></Pressable>
          {aviso.versao.pagina ? <Link url={aviso.versao.pagina}>ver downloads</Link> : null}
        </View>
      ) : null}
      {aviso.detalhe ? (ehLink ? <Link url={aviso.detalhe} style={{marginTop: 4, fontSize: 12.5}}>Downloads</Link>
        : <T style={{color: cor, fontSize: 12, opacity: 0.85, lineHeight: 20, marginTop: 2}}>{aviso.detalhe}</T>) : null}
    </View>
  );
}

export function DicaVersao({ margem }: { margem: number }) {
  const {dica, fecharDica} = useApp();
  if (!dica || dica.tipo !== 'pagina') return null;
  const recarregar = () => { if (ehWeb && typeof location !== 'undefined') location.reload(); };
  return (
    <View style={[st.dica, {marginHorizontal: margem}]} testID="dicaVersao">
      <T style={{color: '#ddd6fe', fontSize: 12.8, flexShrink: 1}}>🆕 Versão nova disponível ({versaoCurta(dica.versao)}): ela já vale na próxima vez que abrir. </T>
      <T style={{color: C.dellEsc, fontSize: 12.8, textDecorationLine: 'underline'}} onPress={recarregar}>Recarregar agora</T>
      <Pressable onPress={fecharDica} accessibilityLabel="Fechar" style={{marginLeft: 'auto', paddingHorizontal: 4}}><T style={{color: C.dell, fontSize: 16}}>✕</T></Pressable>
    </View>
  );
}

function Chip({ ativo, emBreve, onPress, children, item }: { ativo: boolean; emBreve?: boolean; onPress: () => void; children: React.ReactNode; item?: boolean }) {
  const pad = item ? {paddingVertical: 6, paddingHorizontal: 12} : {paddingVertical: 7, paddingHorizontal: 14};
  const conteudo = <T peso="semi" style={{fontSize: item ? 12.8 : 13.4, color: ativo ? '#fff' : C.txt}}>{children}</T>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: ativo}} style={{opacity: emBreve && !ativo ? 0.6 : 1}}>
      {ativo ? <Grad style={[st.chip, pad, {borderColor: 'transparent'}]}>{conteudo}</Grad>
        : <View style={[st.chip, pad, emBreve && {borderStyle: 'dashed'}]}>{conteudo}</View>}
    </Pressable>
  );
}

export function Secoes({ margem }: { margem: number }) {
  const {sel, escolher, pcs, jogos} = useApp();
  const {width} = useWindowDimensions();
  const s = secaoAtual(sel), sb = subAtual(sel), it = itemAtual(sel);
  const itens = sb.itens || [];
  const n = (t: number | string) => <T style={{fontSize: 12.5, opacity: 0.8}}> {t}</T>;
  return (
    <View style={{paddingHorizontal: margem, paddingTop: 14, gap: 10}} accessibilityLabel="Escolha o que buscar">
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}} accessibilityRole="tablist">
        {SECOES.map(x => {
          const ativo = x.id === s.id, tot = x.id === 'computadores' ? pcs.length : jogos.length;
          const corpo = (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: width <= 500 ? 9 : 12}}>
              <T style={{fontSize: width <= 500 ? 21 : 27}}>{x.icone}</T>
              <View style={{flexShrink: 1}}>
                <T peso="extra" style={{fontSize: width <= 500 ? 14.7 : 16}}>{x.nome}</T>
                <T style={{fontSize: 12, color: C.sub}}>{x.desc} · {tot} ofertas</T>
              </View>
            </View>
          );
          return (
            <Pressable key={x.id} onPress={() => escolher({secao: x.id})} accessibilityRole="tab" accessibilityState={{selected: ativo}} testID={'secao-' + x.id}
              style={{flexGrow: 1, flexBasis: width <= 500 ? 140 : 200, maxWidth: 300}}>
              {ativo ? <Grad style={[st.cardSecao, {padding: 1.5}]}><View style={[st.cardInterno, width <= 500 && {paddingVertical: 10, paddingHorizontal: 12}]}>{corpo}</View></Grad>
                : <View style={[st.cardSecao, st.cardInterno, {borderWidth: 1, borderColor: C.borda, backgroundColor: C.card}, width <= 500 && {paddingVertical: 10, paddingHorizontal: 12}]}>{corpo}</View>}
            </Pressable>
          );
        })}
      </View>
      <View style={st.chips}>
        <T peso="negrito" style={st.rot}>{s.nome}:</T>
        {s.subs.map(x => (
          <Chip key={x.id} ativo={x.id === sb.id} emBreve={x.emBreve} onPress={() => escolher({sub: x.id})}>
            {x.icone} {x.nome}{x.emBreve ? n('(em breve)') : n(contar(s.id, x.id, pcs, jogos))}
          </Chip>
        ))}
      </View>
      {itens.length ? (
        <View style={st.chips}>
          <T peso="negrito" style={st.rot}>{sb.nome}:</T>
          <Chip item ativo={!it} onPress={() => escolher({item: ''})}>Todos os {sb.nome.toLowerCase()}{n(contar(s.id, sb.id, pcs, jogos))}</Chip>
          {itens.map(i => <Chip item key={i.id} ativo={!!it && it.id === i.id} onPress={() => escolher({item: i.id})}>{i.icone} {i.nome}{n(contar(s.id, sb.id, pcs, jogos, i.id))}</Chip>)}
          <T style={{fontSize: 12.3, color: C.sub}}>mais tipos de acessório em breve</T>
        </View>
      ) : null}
    </View>
  );
}

export function Rodape() {
  return (
    <View style={{paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28, maxWidth: 1100, alignSelf: 'center'}}>
      <T style={st.rodape}>
        Preços coletados pelo servidor em lojas e comparadores: Dell.com, KaBuM!, Amazon.com.br, lojas com catálogo público (iByte, Webcontinental, Fast Shop, Gazin e outras) e Zoom/Buscapé (que mostra ofertas de Magazine Luiza, Casas Bahia e outras).
        Games: KaBuM!, Zoom/Buscapé, AliExpress, iByte/Webcontinental; Shopee, Temu e Mercado Livre são tentados a cada coleta, mas costumam recusar buscas automáticas (aí fica o preço da coleta anterior, marcado).
        Desconto % = (De − Por) ÷ De, só quando a loja mostra um preço &quot;De&quot;. KaBuM!: preço à vista (o preço a prazo aparece à parte e não conta como desconto). Tudo pode mudar a qualquer momento.
        Cupons vieram de sites e canais de cupons (termos não oficiais da loja; muitos são por tempo limitado ou já esgotados).{' '}
        <T peso="negrito" style={[st.rodape, {color: C.sub}]}>Cupons podem expirar ou não se aplicar a todos os produtos: teste no carrinho.</T>
      </T>
      <T style={[st.rodape, {marginTop: 6}]}>{NATIVO ? 'App Android' : 'Site'} · servidor {SERVIDOR_PUBLICO.replace('https://', '')}</T>
    </View>
  );
}

const st = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingHorizontal: 22, paddingVertical: 14,
    backgroundColor: 'rgba(9,9,15,0.85)', borderBottomWidth: 1, borderColor: C.borda},
  logo: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  refresh: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  instalar: {height: 46, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  aviso: {marginTop: 14, paddingVertical: 11, paddingHorizontal: 16, borderRadius: RAIO_P, borderWidth: 1},
  btnVersao: {backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14},
  dica: {marginTop: 8, paddingVertical: 6, paddingLeft: 12, paddingRight: 10, borderRadius: RAIO_P, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(139,92,246,0.35)',
    backgroundColor: 'rgba(139,92,246,0.08)', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6},
  cardSecao: {borderRadius: RAIO, ...sombra},
  cardInterno: {borderRadius: RAIO - 1.5, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(20,20,38,0.97)'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'},
  chip: {borderRadius: 999, borderWidth: 1, borderColor: C.bordaForte, backgroundColor: 'rgba(255,255,255,0.04)'},
  rot: {fontSize: 11.5, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 2},
  rodape: {textAlign: 'center', fontSize: 12.2, lineHeight: 19.5, color: C.fraco},
});
