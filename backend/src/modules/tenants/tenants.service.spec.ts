import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import type { TenantLookup } from './tenants.repository';

/**
 * Testes de unidade do TenantsService (SPEC-016 · slice 16A) com o repositório
 * mockado (sem DB). Foco: resolução pelo número com tolerância ao 9º dígito BR
 * (espelho do `mesmoNumero` do n8n), 404 quando não casa, e listagem só de
 * tenants ativos com número. Como o lookup NÃO é tenant-scoped, o isolamento
 * não se aplica aqui — o repositório filtra apenas `deletedAt: null`.
 */

const CFA: TenantLookup = {
  id: 'tenant-cfa',
  nome: 'CrossFit Arapongas',
  timezone: 'America/Sao_Paulo',
  // SEM o 9º dígito (formato "antigo")
  whatsappNumber: '554399864409',
};

const EVO: TenantLookup = {
  id: 'tenant-evo',
  nome: 'Evotech',
  timezone: 'America/Manaus',
  // COM o 9º dígito
  whatsappNumber: '5511988887777',
};

function build(ativosComNumero: TenantLookup[] = [CFA, EVO]) {
  const repo = {
    listarAtivos: jest.fn().mockResolvedValue(ativosComNumero),
    listarAtivosComNumero: jest.fn().mockResolvedValue(ativosComNumero),
  };
  const service = new TenantsService(repo as never);
  return { service, repo };
}

describe('TenantsService.resolverPorNumero', () => {
  it('resolve pelo número exato (mesmo formato salvo)', async () => {
    const { service } = build();
    const r = await service.resolverPorNumero('554399864409');
    expect(r).toEqual({
      tenantId: 'tenant-cfa',
      timezone: 'America/Sao_Paulo',
      nome: 'CrossFit Arapongas',
    });
  });

  it('tolera o 9º dígito BR: número COM 9 casa o salvo SEM 9', async () => {
    const { service } = build();
    // salvo: 554399864409 (sem 9) · recebido: 5543999864409 (com 9)
    const r = await service.resolverPorNumero('5543999864409');
    expect(r.tenantId).toBe('tenant-cfa');
  });

  it('tolera o 9º dígito BR: número SEM 9 casa o salvo COM 9', async () => {
    const { service } = build();
    // salvo: 5511988887777 (com 9) · recebido: 551188887777 (sem 9)
    const r = await service.resolverPorNumero('551188887777');
    expect(r.tenantId).toBe('tenant-evo');
  });

  it('normaliza dígitos: ignora "+", espaços e sufixo do JID', async () => {
    const { service } = build();
    const r = await service.resolverPorNumero('+55 43 99986-4409@s.whatsapp.net');
    expect(r.tenantId).toBe('tenant-cfa');
  });

  it('NÃO casa por DDD diferente mesmo com os últimos 8 iguais', async () => {
    // mesmos 8 finais (98864409) mas DDD 43 vs 51 → tenants distintos, sem colisão
    const outro: TenantLookup = { ...CFA, id: 'tenant-x', whatsappNumber: '555198864409' };
    const { service } = build([outro]);
    await expect(service.resolverPorNumero('554399864409')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 quando nenhum tenant casa o número', async () => {
    const { service } = build();
    await expect(service.resolverPorNumero('5562900000000')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 quando o número vem vazio/sem dígitos', async () => {
    const { service, repo } = build();
    await expect(service.resolverPorNumero('   ')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // curto-circuito: nem consulta o repositório sem dígitos
    expect(repo.listarAtivosComNumero).not.toHaveBeenCalled();
  });
});

describe('TenantsService.listarAtivos', () => {
  it('mapeia só campos não sensíveis (tenantId/numero/timezone/nome)', async () => {
    const { service } = build();
    const lista = await service.listarAtivos();
    expect(lista).toEqual([
      {
        tenantId: 'tenant-cfa',
        numero: '554399864409',
        timezone: 'America/Sao_Paulo',
        nome: 'CrossFit Arapongas',
      },
      {
        tenantId: 'tenant-evo',
        numero: '5511988887777',
        timezone: 'America/Manaus',
        nome: 'Evotech',
      },
    ]);
  });

  it('usa a fonte que já filtra ativos COM número (não vaza tenant sem número)', async () => {
    const { service, repo } = build();
    await service.listarAtivos();
    expect(repo.listarAtivosComNumero).toHaveBeenCalledTimes(1);
  });

  it('lista vazia quando não há tenants ativos com número', async () => {
    const { service } = build([]);
    await expect(service.listarAtivos()).resolves.toEqual([]);
  });
});
