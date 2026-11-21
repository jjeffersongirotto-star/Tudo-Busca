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
  /** versão MÍNIMA do APK: abaixo dela a busca fica pausada até atualizar */
  nativo?: {versao?: string; android?: string | null; pagina?: string} | null;
  /** último APK publicado (Release nativo-v2.0.N): só sugestão, a busca continua normalmente */
  nativoNovo?: {versao?: string; android?: string | null; pagina?: string} | null;
  app?: {versao?: string; android?: string; windows?: string; pagina?: string; nativo?: {versao?: string; android?: string; pagina?: string}} | null;
}
export type ResultadoVersao = {tipo: 'app' | 'sugestao'; versao: string; link?: string; pagina?: string} | {tipo: 'pagina'; versao: string} | null;

/** App baixado: abaixo da versão MÍNIMA ('app') pausa a busca; havendo APK mais novo ('sugestao') só sugere baixar.
 *  Web: só dica (nunca bloqueia). */
export function decidirVersao(v: RespostaVersao | null, ctx: {nativo: boolean; versaoNativa?: string | null; versaoWeb: string}): ResultadoVersao {
  if (!v || typeof v !== 'object') return null;
  const nat = v.nativo ?? v.app?.nativo, novo = v.nativoNovo;
  if (ctx.nativo && nat?.versao && ctx.versaoNativa && appMaisNovo(nat.versao, ctx.versaoNativa))
    return {tipo: 'app', versao: novo?.versao && appMaisNovo(novo.versao, nat.versao) ? novo.versao : nat.versao,
      link: (novo?.android || nat.android) ?? undefined, pagina: novo?.pagina || nat.pagina};
  if (ctx.nativo && novo?.versao && ctx.versaoNativa && appMaisNovo(novo.versao, ctx.versaoNativa))
    return {tipo: 'sugestao', versao: novo.versao, link: novo.android ?? undefined, pagina: novo.pagina};
  if (!ctx.nativo && paginaMaisNova(v.novo, ctx.versaoWeb)) return {tipo: 'pagina', versao: v.novo!};
  return null;
}
