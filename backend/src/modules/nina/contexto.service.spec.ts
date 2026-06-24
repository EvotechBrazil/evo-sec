import { ContextoRole } from '@prisma/client';
import { ContextoService } from './contexto.service';
import { ContextoRepository } from './contexto.repository';

/**
 * Lógica de memória conversacional (SPEC-006): histórico em ordem cronológica
 * com mapa de role, e gravação na sessão ativa (get-or-create). O escopo de
 * tenant é responsabilidade do repositório (testado em contexto.repository.spec).
 */
describe('ContextoService', () => {
  function build() {
    const repo = {
      sessaoAtivaParaLeitura: jest.fn(),
      sessaoAtivaParaEscrita: jest.fn(),
      append: jest.fn().mockResolvedValue(undefined),
      ultimas: jest.fn(),
    };
    return { service: new ContextoService(repo as unknown as ContextoRepository), repo };
  }

  describe('historico', () => {
    it('retorna [] quando não há sessão ativa (não busca mensagens)', async () => {
      const { service, repo } = build();
      repo.sessaoAtivaParaLeitura.mockResolvedValue(null);
      expect(await service.historico()).toEqual([]);
      expect(repo.ultimas).not.toHaveBeenCalled();
    });

    it('inverte p/ ordem cronológica e mapeia role USER/ASSISTANT', async () => {
      const { service, repo } = build();
      repo.sessaoAtivaParaLeitura.mockResolvedValue({ id: 'sess-1' });
      // repo devolve desc (mais novas primeiro)
      repo.ultimas.mockResolvedValue([
        { role: ContextoRole.ASSISTANT, conteudo: 'resposta' },
        { role: ContextoRole.USER, conteudo: 'pergunta' },
      ]);
      const out = await service.historico();
      expect(out).toEqual([
        { role: 'user', conteudo: 'pergunta' },
        { role: 'assistant', conteudo: 'resposta' },
      ]);
    });

    it('usa o limite default 8 e respeita o limite informado', async () => {
      const { service, repo } = build();
      repo.sessaoAtivaParaLeitura.mockResolvedValue({ id: 'sess-1' });
      repo.ultimas.mockResolvedValue([]);
      await service.historico();
      expect(repo.ultimas).toHaveBeenCalledWith('sess-1', 8);
      await service.historico(3);
      expect(repo.ultimas).toHaveBeenLastCalledWith('sess-1', 3);
    });
  });

  describe('registrar', () => {
    it('grava na sessão de escrita com role USER quando role="user"', async () => {
      const { service, repo } = build();
      repo.sessaoAtivaParaEscrita.mockResolvedValue({ id: 'sess-w' });
      await service.registrar('user', 'oi nina');
      expect(repo.sessaoAtivaParaEscrita).toHaveBeenCalledTimes(1);
      expect(repo.append).toHaveBeenCalledWith('sess-w', ContextoRole.USER, 'oi nina');
    });

    it('mapeia role="assistant" para ASSISTANT', async () => {
      const { service, repo } = build();
      repo.sessaoAtivaParaEscrita.mockResolvedValue({ id: 'sess-w' });
      await service.registrar('assistant', 'feito');
      expect(repo.append).toHaveBeenCalledWith('sess-w', ContextoRole.ASSISTANT, 'feito');
    });
  });
});
