import { proximaOcorrencia } from './recorrencia.util';

const DIA = 86_400_000;

describe('proximaOcorrencia', () => {
  it('NENHUMA e CUSTOM → null (não recorre)', () => {
    const d = new Date('2026-06-25T12:00:00Z');
    expect(proximaOcorrencia(d, 'NENHUMA', d)).toBeNull();
    expect(proximaOcorrencia(d, 'CUSTOM', d)).toBeNull();
  });

  it('DIARIO: avança até a 1ª ocorrência > apos (≤ 1 dia além)', () => {
    const base = new Date('2026-06-25T09:00:00Z');
    const apos = new Date('2026-06-25T09:30:00Z'); // base já passou
    const prox = proximaOcorrencia(base, 'DIARIO', apos)!;
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
    expect(prox.getTime() - apos.getTime()).toBeLessThanOrEqual(DIA);
  });

  it('DIARIO atrasado (3 dias): dispara só a PRÓXIMA futura, sem rajada', () => {
    const base = new Date('2026-06-22T09:00:00Z'); // 3 dias atrás
    const apos = new Date('2026-06-25T09:30:00Z');
    const prox = proximaOcorrencia(base, 'DIARIO', apos)!;
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
    expect(prox.getTime() - apos.getTime()).toBeLessThanOrEqual(DIA); // 1 ocorrência, não 4
  });

  it('SEMANAL: 1ª ocorrência > apos (≤ 7 dias além)', () => {
    const base = new Date('2026-06-25T09:00:00Z');
    const apos = new Date('2026-06-26T00:00:00Z');
    const prox = proximaOcorrencia(base, 'SEMANAL', apos)!;
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
    expect(prox.getTime() - apos.getTime()).toBeLessThanOrEqual(7 * DIA);
  });

  it('MENSAL: 1ª ocorrência > apos (≤ ~1 mês além)', () => {
    const base = new Date('2026-06-25T09:00:00Z');
    const apos = new Date('2026-06-25T10:00:00Z');
    const prox = proximaOcorrencia(base, 'MENSAL', apos)!;
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
    expect(prox.getTime() - apos.getTime()).toBeLessThanOrEqual(32 * DIA);
  });

  it('ANUAL: 1ª ocorrência > apos (≤ ~1 ano além)', () => {
    const base = new Date('2026-06-25T09:00:00Z');
    const apos = new Date('2026-06-25T10:00:00Z');
    const prox = proximaOcorrencia(base, 'ANUAL', apos)!;
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
    expect(prox.getTime() - apos.getTime()).toBeLessThanOrEqual(366 * DIA);
  });

  it('MENSAL borda de mês (31/01): avança sem quebrar (overflow nativo do JS)', () => {
    const base = new Date('2026-01-31T12:00:00Z');
    const apos = new Date('2026-02-01T00:00:00Z');
    const prox = proximaOcorrencia(base, 'MENSAL', apos)!;
    expect(prox).toBeInstanceOf(Date);
    expect(prox.getTime()).toBeGreaterThan(apos.getTime());
  });
});
