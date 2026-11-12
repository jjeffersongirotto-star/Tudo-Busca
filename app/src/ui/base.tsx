/** Peças básicas da interface (funcionam no navegador e no app nativo). */
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet, Linking, type TextProps, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { C, F, GRAD, GRAD_QUENTE, RAIO_P, ehWeb } from './tema';

/** Texto com a fonte do app. */
export function T({ style, peso = 'normal', ...p }: TextProps & { peso?: keyof typeof F }) {
  return <Text {...p} style={[{ color: C.txt, fontFamily: F[peso], fontSize: 14 }, style]} />;
}
export const Meta = (p: TextProps) => <T {...p} style={[s.meta, p.style]} />;

export function Grad({ quente, style, children }: { quente?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return <LinearGradient colors={quente ? GRAD_QUENTE : GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>{children}</LinearGradient>;
}

/** Abre link (no navegador, em outra aba). */
export const abrir = (url?: string) => { if (url) Linking.openURL(url).catch(() => {}); };
export function Link({ url, children, style }: { url?: string; children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <T style={[{ color: C.ciano, textDecorationLine: 'underline' }, style]} onPress={() => abrir(url)} accessibilityRole="link">{children}</T>;
}

export function Tag({ children, fundo, cor, borda, grad, style }: { children: ReactNode; fundo?: string; cor?: string; borda?: string; grad?: readonly string[]; style?: StyleProp<ViewStyle> }) {
  const txt = <T peso="negrito" style={{ fontSize: 10.7, color: cor || '#d4d4e0' }}>{children}</T>;
  if (grad) return <LinearGradient colors={grad as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.tag, style]}>{txt}</LinearGradient>;
  return <View style={[s.tag, { backgroundColor: fundo || 'rgba(255,255,255,0.07)', borderColor: borda || 'transparent' }, style]}>{txt}</View>;
}

export function Botao({ titulo, onPress, tipo = 'azul', style, desativado, rotulo }: { titulo: string; onPress: () => void; tipo?: 'azul' | 'contorno'; style?: StyleProp<ViewStyle>; desativado?: boolean; rotulo?: string }) {
  const corpo = <T peso="negrito" style={{ color: tipo === 'azul' ? '#fff' : C.txt, fontSize: 13.8, textAlign: 'center' }}>{titulo}</T>;
  return (
    <Pressable onPress={onPress} disabled={desativado} accessibilityRole="button" accessibilityLabel={rotulo || titulo}
      style={({ pressed }) => [{ opacity: desativado ? 0.5 : pressed ? 0.8 : 1, borderRadius: 999 }, style]}>
      {tipo === 'azul'
        ? <Grad style={s.botao}>{corpo}</Grad>
        : <View style={[s.botao, { borderWidth: 1, borderColor: C.bordaForte }]}>{corpo}</View>}
    </Pressable>
  );
}

/** Lista de escolha (no navegador vira <select>). */
export function Select({ rotulo, valor, opcoes, aoMudar, style, compacto }: { rotulo?: string; valor: string; opcoes: readonly (readonly [string, string])[]; aoMudar: (v: string) => void; style?: StyleProp<ViewStyle>; compacto?: boolean }) {
  return (
    <View style={[{ gap: 5, minWidth: 0 }, style]}>
      {rotulo ? <T peso="negrito" style={s.rotulo}>{rotulo}</T> : null}
      <View style={[s.select, compacto && { paddingVertical: 0 }]}>
        <Picker selectedValue={valor} onValueChange={v => aoMudar(String(v))} accessibilityLabel={rotulo}
          style={[s.picker, ehWeb ? (PICKER_WEB as object) : null]} dropdownIconColor={C.sub} mode="dropdown">
          {opcoes.map(([v, t]) => <Picker.Item key={v} label={t} value={v} color={ehWeb ? undefined : C.txt} style={{ backgroundColor: C.bgAlt }} />)}
        </Picker>
      </View>
    </View>
  );
}

export function Check({ rotulo, valor, aoMudar, style }: { rotulo: string; valor: boolean; aoMudar: (v: boolean) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={() => aoMudar(!valor)} accessibilityRole="checkbox" accessibilityState={{ checked: valor }} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <View style={[s.caixa, valor && { backgroundColor: C.roxo, borderColor: C.roxo }]}>{valor ? <T peso="extra" style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</T> : null}</View>
      <T style={{ fontSize: 13, flexShrink: 1 }}>{rotulo}</T>
    </Pressable>
  );
}

/** Bloco que abre e fecha (como <details>). */
export function Recolhivel({ titulo, children, style, inicial = false }: { titulo: string; children: ReactNode; style?: StyleProp<ViewStyle>; inicial?: boolean }) {
  const [aberto, setAberto] = useState(inicial);
  return (
    <View style={[s.regras, style]}>
      <Pressable onPress={() => setAberto(!aberto)} accessibilityRole="button" accessibilityState={{ expanded: aberto }}>
        <T peso="negrito" style={{ color: C.dellEsc, fontSize: 12.8 }}>{aberto ? '▾' : '▸'} {titulo}</T>
      </Pressable>
      {aberto ? <View style={{ marginTop: 6, gap: 6 }}>{children}</View> : null}
    </View>
  );
}

/** Tabela simples: cabeçalho + linhas de texto. */
export function Tabela({ cab, linhas }: { cab?: string[]; linhas: (string | number)[][] }) {
  return (
    <View style={s.tabela}>
      {cab ? <View style={[s.linha, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>{cab.map((c, i) => <T key={i} peso="negrito" style={s.celula}>{c}</T>)}</View> : null}
      {linhas.map((l, i) => <View key={i} style={s.linha}>{l.map((c, j) => <T key={j} style={s.celula}>{String(c)}</T>)}</View>)}
    </View>
  );
}

export const Icone = {
  estrela: (on: boolean, cor = '#fcd34d') => <Svg width={17} height={17} viewBox="0 0 24 24" fill={on ? cor : 'none'} stroke={cor} strokeWidth={2} strokeLinejoin="round"><Path transform="translate(0 .42)" d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" /></Svg>,
  mais: () => <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.txt} strokeWidth={2.6} strokeLinecap="round"><Path d="M12 5v14M5 12h14" /></Svg>,
  menos: () => <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={C.txt} strokeWidth={2.6} strokeLinecap="round"><Path d="M5 12h14" /></Svg>,
  atualizar: (cor = C.txt) => <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><Path d="M21 3v5h-5" /></Svg>,
  lupa: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></Svg>,
  baixar: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 3v12" /><Path d="m7 10 5 5 5-5" /><Path d="M5 21h14" /></Svg>,
  note: (cor = '#b8b8c8') => <Svg width="42%" height="42%" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><Rect x={4} y={5} width={16} height={11} rx={1.5} /><Path d="M2 19h20" /></Svg>,
};

/** Foto do produto (vinda da loja); sem foto, ou se a loja não deixar carregar, aparece um ícone. */
export function Foto({ url, nome, grande, tam = 76 }: { url?: string; nome: string; grande?: boolean; tam?: number }) {
  const [falhou, setFalhou] = useState(false);
  const u = !falhou && /^https:\/\//.test(url || '') ? url : '';
  const dim: ViewStyle = grande ? { width: '100%', height: tam, borderRadius: RAIO_P, marginBottom: 14 } : { width: tam, height: tam, borderRadius: 14 };
  return (
    <View style={[s.foto, dim, { backgroundColor: u ? '#fff' : 'rgba(255,255,255,0.05)' }]}>
      {!u ? Icone.note(C.fraco) : ehWeb
        ? <img src={u} alt={nome} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFalhou(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: grande ? 14 : 6, boxSizing: 'border-box', background: '#fff' }} />
        : <Image source={{ uri: u }} accessibilityLabel={nome} contentFit="contain" onError={() => setFalhou(true)}
            style={{ position: 'absolute', top: grande ? 14 : 6, left: grande ? 14 : 6, right: grande ? 14 : 6, bottom: grande ? 14 : 6 }} />}
    </View>
  );
}

/** Barra de nota (0–100) com rótulo. */
export function Barra({ rotulo, valor, texto, extra }: { rotulo: string; valor: number; texto: string; extra?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
      <T style={{ fontSize: 11.7, color: C.sub }}>{rotulo} <T peso="extra" style={{ fontSize: 13.6 }}>{texto}</T></T>
      <View style={{ flex: 1, minWidth: 60, height: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
        <Grad style={{ height: '100%', width: `${Math.max(0, Math.min(100, valor))}%`, borderRadius: 999 }} />
      </View>
      {extra ? <T style={{ fontSize: 11.7, color: C.sub }}>{extra}</T> : null}
    </View>
  );
}

const PICKER_WEB = { borderWidth: 0, paddingVertical: 8, paddingHorizontal: 10, fontFamily: 'PlusJakartaSans_500Medium', outlineStyle: 'none', cursor: 'pointer' };
export const s = StyleSheet.create({
  meta: { fontSize: 12.3, color: C.sub, lineHeight: 18.5 },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', alignSelf: 'flex-start' },
  botao: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 11.5, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  select: { borderWidth: 1, borderColor: C.bordaForte, borderRadius: 10, backgroundColor: C.bgAlt, overflow: 'hidden', justifyContent: 'center' },
  picker: { color: C.txt, backgroundColor: C.bgAlt, fontSize: 13.6, minHeight: 36 },
  caixa: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: C.bordaForte, alignItems: 'center', justifyContent: 'center' },
  regras: { borderWidth: 1, borderColor: C.borda, borderRadius: RAIO_P, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: 'rgba(255,255,255,0.025)' },
  tabela: { borderWidth: 1, borderColor: C.borda, borderRadius: 6, marginVertical: 6, overflow: 'hidden' },
  linha: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.borda },
  celula: { flex: 1, paddingVertical: 4, paddingHorizontal: 7, fontSize: 12.3 },
  foto: { borderWidth: 1, borderColor: C.borda, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
