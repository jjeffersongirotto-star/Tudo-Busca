/** Atualização OTA: tamanho do que falta baixar e progresso em bytes (a partir do manifesto que o servidor entrega). */

interface ArquivoManifesto { key?: string }
interface ManifestoOta {
  launchAsset?: ArquivoManifesto;
  assets?: ArquivoManifesto[];
  extra?: { tudoBusca?: { versao?: string; tamanhos?: Record<string, number> } };
}

export interface InfoOta {
  /** versão nova (ex.: "0.52") */
  versao?: string;
  /** bytes que precisam ser baixados (arquivos que o app ainda não tem) */
  baixar: number;
  /** quantos arquivos precisam ser baixados / quantos o manifesto tem ao todo */
  k: number;
  n: number;
}

/** Compara o manifesto novo com o atual: só baixa o código e os arquivos que mudaram. */
export function infoOta(novo: unknown, atual: unknown): InfoOta | null {
  const m = novo as ManifestoOta | undefined;
  const extra = m?.extra?.tudoBusca;
  if (!m || !extra?.tamanhos) return null;
  const assets = m.assets || [];
  const temAtual = new Set(((atual as ManifestoOta | undefined)?.assets || []).map(a => a.key).filter(Boolean));
  // sem a lista do atual (app recém-instalado), as imagens/fontes já vêm no APK com o mesmo nome: só o código é novo
  const novos = temAtual.size ? assets.filter(a => a.key && !temAtual.has(a.key)) : [];
  const precisa = [m.launchAsset, ...novos].filter((a): a is ArquivoManifesto => !!a?.key);
  return {
    versao: extra.versao,
    baixar: precisa.reduce((s, a) => s + (extra.tamanhos![a.key!] || 0), 0),
    k: Math.max(1, precisa.length),
    n: assets.length + 1,
  };
}

/**
 * O expo-updates informa o progresso como a média por arquivo (os que já existem contam 100% logo no início).
 * Converte para bytes do que realmente está sendo baixado.
 */
export function progressoOta(p: number | undefined, info: InfoOta | null): { bytes: number; pct: number } {
  const bruto = Math.min(1, Math.max(0, p || 0));
  if (!info || !info.baixar) return {bytes: 0, pct: Math.round(bruto * 100)};
  const feito = Math.min(1, Math.max(0, (bruto * info.n - (info.n - info.k)) / info.k));
  return {bytes: feito * info.baixar, pct: Math.round(feito * 100)};
}

/** 850 KB, 3,7 MB */
export function fmtBytes(b: number): string {
  if (b < 1024 * 1024) return `${Math.max(0, Math.round(b / 1024))} KB`;
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
