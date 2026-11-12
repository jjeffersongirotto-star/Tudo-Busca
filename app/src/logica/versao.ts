/** Versões: da página/app web (AAAA.MM.DD.HHMM-hash) e do app baixado (1.0.N). */
export const chaveVersao = (v?: string | null) => (String(v || '').match(/^\d{4}\.\d{2}\.\d{2}\.\d{4}/) || [''])[0];
export const paginaMaisNova = (doServidor?: string | null, minha?: string | null) => !!chaveVersao(doServidor) && chaveVersao(doServidor) > chaveVersao(minha);
export function appMaisNovo(publicado?: string | null, instalado?: string | null): boolean {
  const a = String(publicado || '').split('.').map(n => parseInt(n, 10) || 0), b = String(instalado || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
}
export const versaoCurta = (v?: string | null) => String(v || '?').replace(/^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})(\d{2})-.*/, '$3/$2/$1 $4:$5');

export interface RespostaVersao {
  versao?: string;
  /** versão do app novo (Expo web), quando o servidor a conhece */
  novo?: string | null;
  /** último APK nativo publicado (Release nativo-v2.0.N) */
  nativo?: {versao?: string; android?: string; pagina?: string} | null;
  app?: {versao?: string; android?: string; windows?: string; pagina?: string; nativo?: {versao?: string; android?: string; pagina?: string}} | null;
}
export type ResultadoVersao = {tipo: 'app'; versao: string; link?: string; pagina?: string} | {tipo: 'pagina'; versao: string} | null;

/** App nativo baixado: bloqueia a busca se houver APK mais novo. Web: só dica (nunca bloqueia). */
export function decidirVersao(v: RespostaVersao | null, ctx: {nativo: boolean; versaoNativa?: string | null; versaoWeb: string}): ResultadoVersao {
  if (!v || typeof v !== 'object') return null;
  const nat = v.nativo ?? v.app?.nativo;
  if (ctx.nativo && nat?.versao && ctx.versaoNativa && appMaisNovo(nat.versao, ctx.versaoNativa))
    return {tipo: 'app', versao: nat.versao, link: nat.android, pagina: nat.pagina};
  if (!ctx.nativo && paginaMaisNova(v.novo, ctx.versaoWeb)) return {tipo: 'pagina', versao: v.novo!};
  return null;
}
