/** Etapa 1: tela provisória que prova a camada de dados (cópia local + servidor). A interface completa vem na etapa 2. */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { carregarLocal, aplicarDados, DADOS_VAZIOS } from '@/dados/repositorio';
import { buscarDados } from '@/dados/api';
import { separarSecoes } from '@/logica/secoes';
import { calcularNotas } from '@/logica/nota';
import { calcularOfertas } from '@/logica/ofertas';
import { VERSAO_WEB } from '@/versaoApp';
import { versaoCurta } from '@/logica/versao';

export default function Inicio() {
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [aviso, setAviso] = useState('Carregando…');

  useEffect(() => {
    let vivo = true;
    (async () => {
      const local = await carregarLocal();
      if (!vivo) return;
      setDados(local.dados);
      setAviso(local.temDados ? 'Dados guardados no aparelho.' : 'Buscando dados no servidor…');
      try {
        const r = await aplicarDados(local.dados, await buscarDados());
        if (vivo && r) { setDados(r.dados); setAviso('✔ Carregados os preços da última coleta.'); }
        else if (vivo) setAviso('Dados já estavam atualizados.');
      } catch {
        if (vivo) setAviso('Sem conexão com o servidor: usando a cópia guardada.');
      }
    })();
    return () => { vivo = false; };
  }, []);

  const resumo = useMemo(() => {
    const {pcs, jogos} = separarSecoes(dados.produtos);
    const {notas} = calcularNotas(pcs);
    const {notas: notasG} = calcularOfertas(jogos);
    const melhor = [...pcs].sort((a, b) => (notas.get(b.id)?.total ?? -1) - (notas.get(a.id)?.total ?? -1))[0];
    return {pcs: pcs.length, jogos: jogos.length, cupons: dados.cupons.filter(c => c.ativo !== false).length,
      melhor: melhor ? `${melhor.nome} (${notas.get(melhor.id)?.total}/100)` : '—', comNotaG: [...notasG.values()].filter(x => x.nota != null).length};
  }, [dados]);

  return (
    <ScrollView style={s.fundo} contentContainerStyle={s.conteudo}>
      <Text style={s.titulo}>Tudo-Busca</Text>
      <Text style={s.sub}>Novo app (em construção) · versão {versaoCurta(VERSAO_WEB)}</Text>
      <View style={s.caixa} testID="resumo">
        <Text style={s.txt}>{aviso}</Text>
        <Text style={s.txt}>Atualizado: {dados.ultimaAtualizacaoTexto || '—'}</Text>
        <Text style={s.txt}>💻 Computadores: {resumo.pcs}</Text>
        <Text style={s.txt}>🎮 Games: {resumo.jogos} ({resumo.comNotaG} com nota de oferta)</Text>
        <Text style={s.txt}>🏷️ Cupons ativos: {resumo.cupons}</Text>
        <Text style={s.txt}>Maior desempenho: {resumo.melhor}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#09090f' },
  conteudo: { padding: 24, gap: 12, maxWidth: 820, width: '100%', alignSelf: 'center' },
  titulo: { color: '#fff', fontSize: 28, fontWeight: '800' },
  sub: { color: '#a1a1aa' },
  caixa: { backgroundColor: '#13131c', borderColor: '#27273a', borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  txt: { color: '#e4e4e7' },
});
