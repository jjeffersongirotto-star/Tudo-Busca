import { describe, expect, it } from 'vitest';
import { infoOta, progressoOta, fmtBytes } from '../src/logica/ota';

const novo = {
  launchAsset: {key: 'bundle2'},
  assets: [{key: 'fonte'}, {key: 'icone'}, {key: 'foto-nova'}],
  extra: {tudoBusca: {versao: '0.52', tamanhos: {bundle2: 3_800_000, fonte: 100_000, icone: 20_000, 'foto-nova': 200_000}}},
};

describe('atualização OTA', () => {
  it('conta só o que o app ainda não tem', () => {
    const atual = {launchAsset: {key: 'bundle1'}, assets: [{key: 'fonte'}, {key: 'icone'}]};
    expect(infoOta(novo, atual)).toEqual({versao: '0.52', baixar: 4_000_000, k: 2, n: 4});
  });
  it('sem a lista do app atual: só o código', () => {
    expect(infoOta(novo, undefined)).toEqual({versao: '0.52', baixar: 3_800_000, k: 1, n: 4});
  });
  it('manifesto sem tamanhos: sem informação', () => {
    expect(infoOta({launchAsset: {key: 'x'}}, undefined)).toBeNull();
  });
  it('progresso em bytes: os arquivos que já existem não contam', () => {
    const info = infoOta(novo, undefined)!;
    expect(progressoOta(0.75, info)).toEqual({bytes: 0, pct: 0});        // 3 de 4 já existiam
    expect(progressoOta(0.875, info).pct).toBe(50);
    expect(progressoOta(0.875, info).bytes).toBe(1_900_000);
    expect(progressoOta(1, info)).toEqual({bytes: 3_800_000, pct: 100});
  });
  it('formata KB e MB', () => {
    expect(fmtBytes(850 * 1024)).toBe('850 KB');
    expect(fmtBytes(3.7 * 1024 * 1024)).toBe('3,7 MB');
  });
});
