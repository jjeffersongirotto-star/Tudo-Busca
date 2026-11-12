/** Tipos dos dados servidos por /api/dados (mesmo formato do dados/dados.json do servidor). */

export type SecaoId = 'computadores' | 'games' | string;

export interface Produto {
  id: string;
  nome: string;
  loja?: string;
  vendedor?: string;
  url?: string;
  imagem?: string;
  preco?: string;
  precoNum?: number | null;
  precoDe?: string;
  precoDeNum?: number | null;
  precoPrazo?: string;
  descontoPct?: number | null;
  precoAntigo?: boolean;
  specs?: Record<string, string | number | null | undefined>;
  // computadores
  tipo?: string;
  marca?: string;
  linha?: string;
  modelo?: string;
  sistema?: string;
  cpuModelo?: string;
  procFamilia?: string;
  cpuFamilia?: string;
  cpuGeracao?: string;
  cpuSufixo?: string;
  cpuPerfil?: string;
  gpuModelo?: string;
  gpuDedicada?: boolean | null;
  ramGB?: number | null;
  armazGB?: number | null;
  armazenamento?: string;
  telaPol?: string | number | null;
  telaResW?: number | null;
  telaRes?: string;
  telaHz?: number | null;
  telaOled?: boolean;
  temTela?: boolean;
  pesoKg?: number | null;
  doBanco?: string[];
  // outras seções (games…)
  secao?: SecaoId;
  sub?: string;
  item?: string;
  original?: boolean;
  kit?: boolean;
  edicao?: string;
  menorPrecoVisto?: number;
  menorPrecoData?: string;
}

export interface Cupom {
  id: string;
  codigo?: string;
  loja?: string;
  desconto?: string;
  descricao?: string;
  validade?: string;
  categoria?: string;
  condicoes?: string;
  regras?: string;
  minimo?: number;
  fonte?: string;
  fonteUrl?: string;
  fontesExtras?: { nome: string; url: string }[];
  status?: string;
  ativo?: boolean;
  coletado?: string;
}

export interface Dados {
  ultimaAtualizacao?: string;
  ultimaAtualizacaoTexto?: string;
  atualizacaoPorSecao?: Record<string, string>;
  cupons: Cupom[];
  produtos: Produto[];
  /** formato antigo (só notebooks Dell) */
  notebooks?: Produto[];
}
