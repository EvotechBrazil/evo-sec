import {
  ancorarDataOnly,
  fmtData,
  fmtHora,
  fmtMoeda,
  limitesDaSemana,
  limitesDoDia,
  limitesDoMes,
  seta,
  sparkline,
  truncar,
  variacaoPct,
} from './format.util';

const SP = 'America/Sao_Paulo';

describe('sparkline', () => {
  it('retorna vazio para lista vazia', () => {
    expect(sparkline([])).toBe('');
  });

  it('usa bloco médio quando todos iguais (sem dividir por zero)', () => {
    expect(sparkline([5, 5, 5])).toBe('▄▄▄');
  });

  it('mapeia min ao primeiro bloco e max ao último', () => {
    const s = sparkline([0, 50, 100]);
    expect(s[0]).toBe('▁');
    expect(s[s.length - 1]).toBe('█');
  });
});

describe('seta', () => {
  it('estável quando variação < 1%', () => {
    expect(seta(0.4)).toBe('▬');
  });
  it('subir é bom por padrão', () => {
    expect(seta(20)).toBe('▲');
    expect(seta(-20)).toBe('▼');
  });
  it('baixoEhBom inverte (ex.: atrasados)', () => {
    expect(seta(-20, true)).toBe('▲');
    expect(seta(20, true)).toBe('▼');
  });
});

describe('variacaoPct', () => {
  it('protege divisão por zero', () => {
    expect(variacaoPct(5, 0)).toBeNull();
  });
  it('calcula percentual', () => {
    expect(variacaoPct(120, 100)).toBe(20);
  });
});

describe('fmtMoeda', () => {
  it('formata centavos em BRL', () => {
    // espaço pode ser NBSP dependendo do ICU — compara dígitos/símbolo
    const s = fmtMoeda(123456).replace(/\s/g, ' ');
    expect(s).toContain('R$');
    expect(s).toContain('1.234,56');
  });
});

describe('truncar', () => {
  it('não altera texto curto', () => {
    expect(truncar('linha 1\nlinha 2', 100)).toBe('linha 1\nlinha 2');
  });
  it('corta em linha inteira e marca corte, respeitando o limite', () => {
    const texto = Array.from({ length: 50 }, (_, i) => `linha ${i}`).join('\n');
    const out = truncar(texto, 80);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out).toContain('truncado');
    // nunca corta no meio de uma linha
    expect(out.split('\n').slice(0, -1).every((l) => /^linha \d+$/.test(l))).toBe(true);
  });
});

describe('datas tz-aware (America/Sao_Paulo = UTC-3)', () => {
  it('limitesDoDia: meia-noite local vira 03:00 UTC', () => {
    // 2026-06-19 12:00 UTC → dia local 19/06
    const now = new Date('2026-06-19T12:00:00Z');
    const { inicio, fim } = limitesDoDia(now, SP);
    expect(inicio.toISOString()).toBe('2026-06-19T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-06-20T03:00:00.000Z');
  });

  it('borda de timezone: 23h local ainda é o mesmo dia', () => {
    // 2026-06-20T01:30Z = 2026-06-19 22:30 em SP → dia local = 19/06
    const now = new Date('2026-06-20T01:30:00Z');
    const { inicio } = limitesDoDia(now, SP);
    expect(inicio.toISOString()).toBe('2026-06-19T03:00:00.000Z');
    expect(fmtData(now, SP)).toBe('19/06');
  });

  it('limitesDaSemana: começa no domingo da semana local (sex 19/06 → dom 14/06)', () => {
    const now = new Date('2026-06-19T12:00:00Z'); // sexta 19/06 (09h SP)
    const { inicio, fim } = limitesDaSemana(now, SP);
    expect(inicio.toISOString()).toBe('2026-06-14T03:00:00.000Z'); // domingo 14/06
    expect(fim.toISOString()).toBe('2026-06-21T03:00:00.000Z'); // domingo seguinte
    expect((fim.getTime() - inicio.getTime()) / 86_400_000).toBe(7);
  });

  it('fmtHora formata no fuso do tenant', () => {
    const d = new Date('2026-06-19T12:14:00Z'); // 09:14 em SP
    expect(fmtHora(d, SP)).toBe('09:14');
  });
});

describe('limitesDoMes (SPEC-011)', () => {
  it('mês corrente no fuso local (junho)', () => {
    const now = new Date('2026-06-15T12:00:00Z'); // 15/06 09h SP
    const { inicio, fim } = limitesDoMes(now, SP);
    expect(inicio.toISOString()).toBe('2026-06-01T03:00:00.000Z'); // 1 junho 00:00 SP
    expect(fim.toISOString()).toBe('2026-07-01T03:00:00.000Z'); // 1 julho 00:00 SP
  });

  it('borda de mês: 01/06 01:00Z (= 31/05 22h SP) ainda é MAIO', () => {
    const now = new Date('2026-06-01T01:00:00Z');
    const { inicio, fim } = limitesDoMes(now, SP);
    expect(inicio.toISOString()).toBe('2026-05-01T03:00:00.000Z'); // maio, não junho
    expect(fim.toISOString()).toBe('2026-06-01T03:00:00.000Z');
  });

  it('dezembro → janeiro do ano seguinte', () => {
    const now = new Date('2026-12-15T12:00:00Z');
    const { fim } = limitesDoMes(now, SP);
    expect(fim.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});

describe('ancorarDataOnly (SPEC-011)', () => {
  it('date-only → meio-dia local (exibe o dia certo, sem off-by-one)', () => {
    const d = ancorarDataOnly('2026-06-30', SP);
    expect(d.toISOString()).toBe('2026-06-30T15:00:00.000Z'); // meio-dia SP
    expect(fmtData(d, SP)).toBe('30/06');
  });

  it('ISO com hora/offset passa direto', () => {
    expect(ancorarDataOnly('2026-06-30T10:00:00Z', SP).toISOString()).toBe('2026-06-30T10:00:00.000Z');
    expect(ancorarDataOnly('2026-06-30T10:00:00-03:00', SP).toISOString()).toBe('2026-06-30T13:00:00.000Z');
  });
});
