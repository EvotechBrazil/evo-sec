import { agoraSaoPaulo, ancorarDataBR } from './datas-br.util';

describe('agoraSaoPaulo', () => {
  it('retorna ISO com offset -03:00 e wall-clock de São Paulo', () => {
    // 13:30Z = 10:30 em SP (UTC-3)
    expect(agoraSaoPaulo(new Date('2026-06-24T13:30:00Z'))).toBe('2026-06-24T10:30:00-03:00');
  });

  it('vira o dia certo perto da meia-noite UTC', () => {
    // 2026-06-25T02:00Z = 23:00 do dia 24 em SP
    expect(agoraSaoPaulo(new Date('2026-06-25T02:00:00Z'))).toBe('2026-06-24T23:00:00-03:00');
  });
});

describe('ancorarDataBR', () => {
  it('date-only → meia-noite BR', () => {
    expect(ancorarDataBR('2026-07-30')).toBe('2026-07-30T00:00:00-03:00');
  });

  it('UTC meia-noite → mesmo dia em BR (corrige o off-by-one)', () => {
    expect(ancorarDataBR('2026-07-30T00:00:00Z')).toBe('2026-07-30T00:00:00-03:00');
    expect(ancorarDataBR('2026-07-30T00:00:00.000Z')).toBe('2026-07-30T00:00:00-03:00');
  });

  it('já com offset -03:00 → mantém intacta', () => {
    expect(ancorarDataBR('2026-07-30T14:00:00-03:00')).toBe('2026-07-30T14:00:00-03:00');
  });

  it('datetime sem zona → anexa -03:00 preservando dia/hora', () => {
    expect(ancorarDataBR('2026-07-30T09:00:00')).toBe('2026-07-30T09:00:00-03:00');
  });

  it('vazio/nulo → undefined (chamador decide perguntar)', () => {
    expect(ancorarDataBR(undefined)).toBeUndefined();
    expect(ancorarDataBR(null)).toBeUndefined();
    expect(ancorarDataBR('')).toBeUndefined();
    expect(ancorarDataBR('   ')).toBeUndefined();
  });

  it('prova do bug: a render BR do valor ancorado bate o dia pretendido (30, não 29)', () => {
    const anc = ancorarDataBR('2026-07-30T00:00:00Z') as string;
    const dia = new Date(anc).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    expect(dia).toBe('30/07/2026');
  });
});
