import { dentroQuietHours } from './quiet-hours.util';

const SP = 'America/Sao_Paulo';

describe('dentroQuietHours', () => {
  it('sem início/fim válidos → false', () => {
    const now = new Date('2026-06-25T03:00:00Z');
    expect(dentroQuietHours(now, SP, null, null)).toBe(false);
    expect(dentroQuietHours(now, SP, '22:00', null)).toBe(false);
    expect(dentroQuietHours(now, SP, 'xx:yy', '07:00')).toBe(false);
  });

  it('janela que cruza a meia-noite (22:00–07:00)', () => {
    // 01:00Z = 22:00 BR → dentro (início inclusivo)
    expect(dentroQuietHours(new Date('2026-06-25T01:00:00Z'), SP, '22:00', '07:00')).toBe(true);
    // 03:00Z = 00:00 BR → dentro
    expect(dentroQuietHours(new Date('2026-06-25T03:00:00Z'), SP, '22:00', '07:00')).toBe(true);
    // 13:00Z = 10:00 BR → fora
    expect(dentroQuietHours(new Date('2026-06-25T13:00:00Z'), SP, '22:00', '07:00')).toBe(false);
    // 10:00Z = 07:00 BR → fora (fim exclusivo)
    expect(dentroQuietHours(new Date('2026-06-25T10:00:00Z'), SP, '22:00', '07:00')).toBe(false);
  });

  it('janela no mesmo dia (13:00–14:00)', () => {
    // 16:30Z = 13:30 BR → dentro
    expect(dentroQuietHours(new Date('2026-06-25T16:30:00Z'), SP, '13:00', '14:00')).toBe(true);
    // 18:00Z = 15:00 BR → fora
    expect(dentroQuietHours(new Date('2026-06-25T18:00:00Z'), SP, '13:00', '14:00')).toBe(false);
  });

  it('início == fim → janela inválida → false', () => {
    expect(dentroQuietHours(new Date('2026-06-25T01:00:00Z'), SP, '22:00', '22:00')).toBe(false);
  });

  it('respeita o fuso do tenant (mesmo instante, fusos diferentes)', () => {
    const now = new Date('2026-06-25T09:30:00Z'); // 06:30 BR vs 09:30 UTC
    expect(dentroQuietHours(now, SP, '22:00', '07:00')).toBe(true); // 06:30 BR → dentro
    expect(dentroQuietHours(now, 'UTC', '22:00', '07:00')).toBe(false); // 09:30 UTC → fora
  });
});
