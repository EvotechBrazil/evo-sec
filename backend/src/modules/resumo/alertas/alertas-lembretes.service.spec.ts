import { AlertaLembretesService } from './alertas-lembretes.service';

const SP = 'America/Sao_Paulo';

interface LemOver {
  id?: string;
  titulo?: string;
  descricao?: string | null;
  dataHora?: Date;
  recorrencia?: string;
  status?: string;
}
const lem = (o: LemOver = {}) => ({
  id: o.id ?? 'x',
  titulo: o.titulo ?? 'Tarefa',
  descricao: o.descricao ?? null,
  dataHora: o.dataHora ?? new Date('2026-06-25T11:00:00Z'),
  recorrencia: o.recorrencia ?? 'NENHUMA',
  status: o.status ?? 'PENDENTE',
});

function build(
  opts: {
    ativo?: boolean;
    quietInicio?: string | null;
    quietFim?: string | null;
    disparados?: ReturnType<typeof lem>[];
  } = {},
) {
  const lembretes = {
    dispararPendentes: jest.fn().mockResolvedValue(opts.disparados ?? []),
  };
  const repo = {
    tenantInfo: jest.fn().mockResolvedValue({
      timezone: SP,
      whatsappNumber: '5543999999999',
      quietHoursInicio: opts.quietInicio ?? null,
      quietHoursFim: opts.quietFim ?? null,
    }),
    flagAtiva: jest.fn().mockResolvedValue(opts.ativo ?? true),
  };
  const service = new AlertaLembretesService(lembretes as never, repo as never);
  return { service, lembretes, repo };
}

describe('AlertaLembretesService.gerar', () => {
  it('opt-out (lembretes_ativo=false) → ativo:false e NÃO dispara/muta', async () => {
    const { service, lembretes } = build({ ativo: false });
    const r = await service.gerar('2026-06-25');
    expect(r.ativo).toBe(false);
    expect(r.temLembrete).toBe(false);
    expect(lembretes.dispararPendentes).not.toHaveBeenCalled();
  });

  it('quiet hours (agora dentro da janela) → suprime e NÃO muta', async () => {
    // gerar('2026-06-25') => 12:00Z => 09:00 BR; janela 08:00–10:00 cobre.
    const { service, lembretes } = build({ quietInicio: '08:00', quietFim: '10:00' });
    const r = await service.gerar('2026-06-25');
    expect(r.ativo).toBe(true);
    expect(r.quiet).toBe(true);
    expect(r.temLembrete).toBe(false);
    expect(lembretes.dispararPendentes).not.toHaveBeenCalled();
  });

  it('nada vencido → temLembrete:false, texto vazio (mas dispara foi chamado)', async () => {
    const { service, lembretes } = build({ disparados: [] });
    const r = await service.gerar('2026-06-25');
    expect(lembretes.dispararPendentes).toHaveBeenCalledTimes(1);
    expect(r.temLembrete).toBe(false);
    expect(r.texto).toBe('');
    expect(r.lembretes).toEqual([]);
  });

  it('dispara: monta texto, marca recorrente, formata hora no fuso do tenant', async () => {
    const { service } = build({
      disparados: [
        lem({ titulo: 'Remédio', dataHora: new Date('2026-06-25T11:00:00Z'), recorrencia: 'DIARIO' }),
        lem({ titulo: 'Pagar luz', dataHora: new Date('2026-06-25T12:30:00Z'), recorrencia: 'NENHUMA' }),
      ],
    });
    const r = await service.gerar('2026-06-25');
    expect(r.temLembrete).toBe(true);
    expect(r.dia).toBe('25/06');
    expect(r.lembretes).toHaveLength(2);
    expect(r.lembretes[0]).toEqual({ titulo: 'Remédio', hora: '08:00', recorrencia: 'DIARIO' });
    expect(r.texto).toContain('Remédio');
    expect(r.texto).toContain('Pagar luz');
    expect(r.texto).toContain('08:00');
    expect(r.texto).toContain('🔁'); // marca de recorrente
  });

  it('texto truncado em ≤2000 chars', async () => {
    const muitos = Array.from({ length: 300 }, (_, i) =>
      lem({ id: `l${i}`, titulo: `Lembrete bem comprido número ${i} com texto extra`, dataHora: new Date('2026-06-25T11:00:00Z') }),
    );
    const { service } = build({ disparados: muitos });
    const r = await service.gerar('2026-06-25');
    expect(r.texto.length).toBeLessThanOrEqual(2000);
    expect(r.temLembrete).toBe(true);
  });
});
