/** Cores e medidas do visual escuro (mesmas variáveis da página antiga). */
import { Platform } from 'react-native';

export const C = {
  bg: '#09090f', bgAlt: '#11111b',
  card: 'rgba(255,255,255,0.045)', cardForte: 'rgba(255,255,255,0.075)',
  borda: 'rgba(255,255,255,0.09)', bordaForte: 'rgba(255,255,255,0.18)',
  txt: '#f4f4f8', sub: '#a1a1b5', fraco: '#6e6e85',
  roxo: '#8b5cf6', ciano: '#22d3ee', dell: '#a78bfa', dellEsc: '#c4b5fd',
  ok: '#22c55e', amarelo: '#facc15',
};
export const GRAD = ['#8b5cf6', '#6366f1', '#22d3ee'] as const;
export const GRAD_QUENTE = ['#f97316', '#ec4899'] as const;
export const RAIO = 18, RAIO_P = 12;

export const F = {
  normal: 'PlusJakartaSans_400Regular', medio: 'PlusJakartaSans_500Medium', semi: 'PlusJakartaSans_600SemiBold',
  negrito: 'PlusJakartaSans_700Bold', extra: 'PlusJakartaSans_800ExtraBold', mono: 'JetBrainsMono_700Bold',
};

/** Cores das tags de categoria (Entrada … Topo de linha). */
export const COR_CAT = ['#475569', '#0e7490', '#2563eb', '#7c3aed', ['#db2777', '#9333ea'], ['#f59e0b', '#ef4444']] as const;
export const COR_PERFIL: Record<string, [string, string]> = {
  U: ['rgba(34,197,94,0.14)', '#86efac'], P: ['rgba(250,204,21,0.14)', '#fde68a'], H: ['rgba(248,113,113,0.15)', '#fca5a5'],
  HX: ['#dc2626', '#fff'], ARM: ['rgba(56,189,248,0.15)', '#7dd3fc'], NI: ['rgba(255,255,255,0.06)', C.sub],
};

export const ehWeb = Platform.OS === 'web';
export const sombra = ehWeb ? ({ boxShadow: '0 10px 30px -12px rgba(0,0,0,.6)' } as object) : { elevation: 3 };
