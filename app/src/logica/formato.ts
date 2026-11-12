/** Formatação em português do Brasil (sem depender de Intl, que varia entre navegadores e o Hermes). */

function agrupar(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Número com até `casas` casas decimais (sem zeros à direita), ex.: 1234.5 → "1.234,5". */
export function numBRfmt(v: number, casas = 1): string {
  if (!isFinite(v)) return String(v);
  const neg = v < 0;
  const f = Math.round(Math.abs(v) * 10 ** casas) / 10 ** casas;
  let [i, d = ''] = f.toFixed(casas).split('.');
  d = d.replace(/0+$/, '');
  return (neg && f !== 0 ? '-' : '') + agrupar(i) + (d ? ',' + d : '');
}

export const fmt1 = (v: number) => numBRfmt(v, 1);
export const fmtPct = (v: number) => numBRfmt(v, 1) + '%';
export const fmtPol = (p: unknown) => (p ? String(p).replace('.', ',') + '"' : '');
export const r1 = (v: number) => Math.round(v * 10) / 10;

/** "R$ 1.234,50" (sempre 2 casas). */
export function reais(v: number | null | undefined): string {
  if (v == null) return '';
  const neg = v < 0;
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + 'R$ ' + agrupar(i) + ',' + d;
}

/** "não informado" para vazio. */
export const ni = (v: unknown) => (v === null || v === undefined || v === '' ? 'não informado' : String(v));

/** "1.234,56" → 1234.56 */
export const numBR = (s: string) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
