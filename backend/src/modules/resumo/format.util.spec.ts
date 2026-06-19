import {
  fmtData,
  fmtHora,
  fmtMoeda,
  limitesDaJanela,
  limitesDoDia,
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

  it('limitesDaJanela: 7 dias terminam no fim do dia local', () => {
    const now = new Date('2026-06-19T12:00:00Z');
    const { inicio, fim } = limitesDaJanela(now, SP, 7);
    expect(fim.toISOString()).toBe('2026-06-20T03:00:00.000Z');
    expect(inicio.toISOString()).toBe('2026-06-13T03:00:00.000Z');
  });

  it('fmtHora formata no fuso do tenant', () => {
    const d = new Date('2026-06-19T12:14:00Z'); // 09:14 em SP
    expect(fmtHora(d, SP)).toBe('09:14');
  });
});
