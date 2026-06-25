import { LembretesService } from './lembretes.service';

function build() {
  const repo = {
    findDue: jest.fn(),
    aplicarDisparo: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  return { service: new LembretesService(repo as never), repo };
}

describe('LembretesService.dispararPendentes', () => {
  it('sem lembrete vencido → vazio e não muta', async () => {
    const { service, repo } = build();
    repo.findDue.mockResolvedValue([]);
    expect(await service.dispararPendentes(new Date())).toEqual([]);
    expect(repo.aplicarDisparo).not.toHaveBeenCalled();
  });

  it('não-recorrente vencido → terminal (vai em terminaisIds)', async () => {
    const { service, repo } = build();
    const now = new Date('2026-06-25T12:00:00Z');
    const l = {
      id: 'a',
      titulo: 'Pagar',
      dataHora: new Date('2026-06-25T11:00:00Z'),
      recorrencia: 'NENHUMA',
      status: 'PENDENTE',
    };
    repo.findDue.mockResolvedValue([l]);
    const r = await service.dispararPendentes(now);
    expect(r).toEqual([l]); // devolve com a dataHora ORIGINAL (hora do disparo)
    expect(repo.aplicarDisparo).toHaveBeenCalledWith(['a'], []);
  });

  it('recorrente vencido → avança dataHora p/ o futuro, sem terminar', async () => {
    const { service, repo } = build();
    const now = new Date('2026-06-25T12:00:00Z');
    const l = {
      id: 'b',
      titulo: 'Remédio',
      dataHora: new Date('2026-06-25T11:00:00Z'),
      recorrencia: 'DIARIO',
      status: 'PENDENTE',
    };
    repo.findDue.mockResolvedValue([l]);
    await service.dispararPendentes(now);
    const [terminais, avancos] = repo.aplicarDisparo.mock.calls[0];
    expect(terminais).toEqual([]);
    expect(avancos).toHaveLength(1);
    expect(avancos[0].id).toBe('b');
    expect(avancos[0].proxima.getTime()).toBeGreaterThan(now.getTime());
  });

  it('CUSTOM vencido → terminal (não recorre, não re-dispara)', async () => {
    const { service, repo } = build();
    const now = new Date('2026-06-25T12:00:00Z');
    const l = { id: 'c', dataHora: new Date('2026-06-25T11:00:00Z'), recorrencia: 'CUSTOM' };
    repo.findDue.mockResolvedValue([l]);
    await service.dispararPendentes(now);
    expect(repo.aplicarDisparo).toHaveBeenCalledWith(['c'], []);
  });

  it('mistura: separa terminais (NENHUMA) de avanços (recorrentes)', async () => {
    const { service, repo } = build();
    const now = new Date('2026-06-25T12:00:00Z');
    const due = [
      { id: 'a', dataHora: new Date('2026-06-25T11:00:00Z'), recorrencia: 'NENHUMA' },
      { id: 'b', dataHora: new Date('2026-06-25T10:00:00Z'), recorrencia: 'SEMANAL' },
    ];
    repo.findDue.mockResolvedValue(due);
    await service.dispararPendentes(now);
    const [terminais, avancos] = repo.aplicarDisparo.mock.calls[0];
    expect(terminais).toEqual(['a']);
    expect(avancos.map((x: { id: string }) => x.id)).toEqual(['b']);
  });
});
