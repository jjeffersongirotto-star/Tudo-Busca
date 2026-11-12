/** "Como a nota é calculada" (computadores) e "Como a nota de oferta é calculada" (games). */
import { View } from 'react-native';
import { T, Tabela } from './base';
import { C } from './tema';
import { NOTA, PADRAO, CATEGORIAS, DESC_CAT, P_HW, P_PRECO, type Pontuacao } from '@/logica/nota';
import { OFERTA, type RefG } from '@/logica/ofertas';
import { fmt1, reais } from '@/logica/formato';
import type { Produto } from '@/logica/tipos';

const P = ({ children }: { children: React.ReactNode }) => <T style={{fontSize: 12.8, lineHeight: 19.2}}>{children}</T>;
const B = ({ children }: { children: React.ReactNode }) => <T peso="extra" style={{fontSize: 12.8}}>{children}</T>;
const tam = (g: number) => g >= 1000 ? g / 1000 + ' TB' : g + ' GB';
const Est = ({ children }: { children: React.ReactNode }) => (
  <View style={{backgroundColor: 'rgba(250,204,21,0.10)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.35)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10}}>
    <T style={{fontSize: 12.8, lineHeight: 19.2, color: '#fef3c7'}}>{children}</T>
  </View>
);

export function RegrasPC({ pcs, notas }: { pcs: Produto[]; notas: Map<string, Pontuacao> }) {
  const porCat = (c: string) => pcs.filter(n => notas.get(n.id)?.cat === c).length;
  return (
    <View style={{gap: 6}}>
      <P><B>Duas notas, escolhidas pelo checkbox &quot;Custo-benefício&quot; nos filtros:</B></P>
      <P><B>1. Desempenho (checkbox desmarcado, padrão)</B> — só o hardware, sem olhar o preço. Cada computador soma os pontos dos 5 itens abaixo (máx. {NOTA.maxBruto}) e a soma vira uma nota de <B>0 a 100</B> (pontos ÷ {NOTA.maxBruto} × 100). Para chegar a 100 seria preciso ter a melhor peça em todos os itens. Mostra o computador mais completo, mesmo que seja caro.</P>
      <P><B>2. Custo-benefício (checkbox marcado)</B> — <B>{P_HW}% Desempenho + {P_PRECO}% valor pelo preço</B>. O valor pelo preço é o Desempenho dividido pelo preço (<B>pontos por R$ 1.000</B>), comparado com o melhor do mesmo grupo (notebooks, PCs de mesa ou all-in-one) e convertido para 0–100. Como o hardware pesa {P_HW}%, um computador fraco não fica bem avaliado só por ser barato (Desempenho 35 e o mais barato do grupo → {fmt1((1 - NOTA.pesoPreco) * 35 + NOTA.pesoPreco * 100)}), e um computador forte não perde tanto por ser caro. Produtos sem preço ficam sem custo-benefício.</P>
      <P>PCs sem tela (de mesa, mini PC, Mac mini) não usam o item Tela: a soma vai até {NOTA.maxBruto - NOTA.max.tela} e vira 0–100 do mesmo jeito. O desconto <B>não</B> soma pontos (ele já está no preço); o selo de desconto e os filtros de promoção são só informativos.</P>
      <P><B>Categorias.</B> Cada computador entra numa categoria, decidida só pelo que se sabe dele (processador, placa de vídeo, linha como &quot;Predator&quot; ou &quot;IdeaPad&quot;, preço): <B>Entrada · Básico · Intermediário · Gamer · Avançado · Topo de linha</B>.</P>
      <Est><T peso="extra" style={{fontSize: 12.8, color: '#fef3c7'}}>Dado que falta.</T> Primeiro o servidor procura no banco de dados (o que já foi descoberto desse modelo em coletas anteriores ou em outra loja); isso não é estimativa. Se não houver em lugar nenhum, entra o valor típico da categoria (tabela abaixo), em amarelo (&quot;estimado&quot;). Ex.: um Básico sem RAM informada conta como 8 GB.</Est>
      <Tabela cab={['Categoria', 'Processador', 'Placa de vídeo', 'RAM', 'Armaz.', 'Tela', 'Produtos']}
        linhas={CATEGORIAS.map(c => { const p = PADRAO[c]; return [`${c}\n${DESC_CAT[c]}`, `${p.cpuFamilia} ${p.cpuSufixo}`, p.gpuModelo, `${p.ramGB} GB`, tam(p.armazGB), `${p.telaResW} px · ${p.telaHz} Hz`, porCat(c)]; })} />
      <P><B>1. Processador (máx. {NOTA.max.proc})</B> = base da família + geração + sufixo (perfil). O perfil pesa bastante: HX soma 10 e H/HS 8, contra 0 do U. Como a geração vale no máximo 3, um chip U nunca passa um H/HX da mesma família.</P>
      <Tabela cab={['Família', 'Base']} linhas={Object.entries(NOTA.procBase)} />
      <Tabela cab={['Geração', 'Pontos']} linhas={NOTA.procGer.map(r => [r[2], '+' + r[1]])} />
      <Tabela cab={['Sufixo (perfil)', 'Pontos']} linhas={[...NOTA.procSuf.map(r => [r[2], '+' + r[1]]), ['Sem sufixo / não informado', 'padrão da categoria (amarelo)']]} />
      <P><B>2. Placa de vídeo (máx. {NOTA.max.gpu})</B></P>
      <Tabela cab={['GPU', 'Pontos']} linhas={[...Object.entries(NOTA.gpu), ['Dedicada sem modelo / não informado', 'padrão da categoria (amarelo)']]} />
      <P><B>3. Memória RAM (máx. {NOTA.max.ram})</B></P>
      <Tabela cab={['A partir de', 'Pontos']} linhas={NOTA.ram.map(r => [r[0] + ' GB', r[1]])} />
      <P><B>4. Armazenamento (máx. {NOTA.max.armaz})</B></P>
      <Tabela cab={['A partir de', 'Pontos']} linhas={NOTA.armaz.map(r => [tam(r[0]), r[1]])} />
      <P><B>5. Tela (máx. {NOTA.max.tela})</B> = resolução + OLED + taxa de atualização + tamanho</P>
      <Tabela cab={['Resolução (largura)', 'Pontos']} linhas={[...NOTA.res.map(r => [r[2] + ' (≥ ' + r[0] + ' px)', r[1]]), ['Painel OLED', '+' + NOTA.oled]]} />
      <Tabela cab={['Taxa de atualização', 'Pontos']} linhas={[['240 Hz ou mais', 4], ['144–239 Hz', 3], ['90–143 Hz', 2], ['até 89 Hz (ex.: 60 Hz)', 1], ['não informado', 'padrão da categoria (amarelo)']]} />
      <Tabela cab={['Tamanho', 'Pontos']} linhas={[['15" ou mais', '+' + NOTA.telaGrande], ['menor que 15"', 0]]} />
      <P><B>Exemplo:</B> soma 63 → 63 ÷ {NOTA.maxBruto} × 100 = 70/100. Desconto % = (De − Por) ÷ De aparece no selo do card, mas não soma pontos.</P>
    </View>
  );
}

export function RegrasG({ refs: refG }: { refs: Record<string, RefG> }) {
  const linhas = Object.entries(refG).filter(([, r]) => r.qtd >= OFERTA.minimoAnuncios).map(([k, r]) => [k.split('|')[1], reais(r.mediana), reais(r.min), r.qtd]);
  return (
    <View style={{gap: 6}}>
      <P><B>Nota de oferta (0 a 100)</B> — compara o preço do anúncio com o <B>preço típico</B> (mediana) dos anúncios do <B>mesmo modelo</B> coletados agora em todas as lojas. No preço típico a nota é 50; cada 1% mais barato soma {OFERTA.fator} pontos e cada 1% mais caro tira {OFERTA.fator} (20% abaixo do típico = 100; 20% acima = 0).</P>
      <P>Grupos comparados: DualSense, DualSense Edge e Access (originais Sony) ficam separados; controles de outras marcas são comparados entre si. Kits (controle + jogo/base) e anúncios com preço de coleta anterior não entram no preço típico. O desconto &quot;De → Por&quot; da loja aparece no selo, mas não muda a nota (em marketplaces o &quot;De&quot; costuma ser inflado).</P>
      <Tabela cab={['Modelo', 'Preço típico', 'Menor agora', 'Anúncios']} linhas={linhas} />
      <Est><T peso="extra" style={{fontSize: 12.8, color: '#fef3c7'}}>Original?</T> Em marketplaces (AliExpress, Shopee, Temu, Mercado Livre) &quot;original&quot; é o que o vendedor diz no anúncio; confira a loja/vendedor antes de comprar. Preço do AliExpress: o valor com desconto mostrado na busca (pode depender de cupom ou de ser novo usuário) e, se vier da China, pode haver imposto.</Est>
    </View>
  );
}
export { C };
