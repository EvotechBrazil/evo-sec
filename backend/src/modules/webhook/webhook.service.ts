import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppEnv, loadEnv } from '../../config/env.config';
import { fetchComTimeout } from '../../common/http/fetch-timeout.util';

/**
 * Ponte de webhook Evolution → cérebro da Nina no n8n.
 *
 * Contexto (2026-06-25): por segurança, a entrada externa de webhooks passou a
 * ser a API (`api.evofit.tech`, porta única). Mas o cérebro vive no n8n, cujo
 * webhook NÃO é exposto por esse domínio — então o POST do Evolution caía no
 * backend e tomava 404 (Nina ficava muda). Esta ponte repassa o payload CRU pro
 * webhook do n8n (server-to-server), preservando o `?token=` recebido.
 *
 * Segurança: o portão é o nó `Valida Segredo` do n8n (já validado E2E — forjado
 * bloqueado, real passa). O backend repassa o token intacto. Opcionalmente, se
 * `NINA_WEBHOOK_TOKEN` estiver setado, o backend já barra o token errado aqui
 * (defesa em profundidade), sem nem tocar o n8n. Não é tenant-scoped nem JWT.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly env: AppEnv = loadEnv();

  async repassarNina(
    payload: unknown,
    token: string | undefined,
  ): Promise<{ status: string }> {
    const destino = this.env.ninaN8nWebhookUrl;
    if (!destino) {
      this.logger.error('NINA_N8N_WEBHOOK_URL vazio — sem destino de repasse.');
      throw new ServiceUnavailableException('Destino do n8n não configurado.');
    }

    // Defesa em profundidade OPCIONAL: com NINA_WEBHOOK_TOKEN setado, barra o
    // token errado aqui. Sem ele, o portão é o n8n (`Valida Segredo`).
    const esperado = this.env.ninaWebhookToken;
    if (esperado && token !== esperado) {
      // Não logamos o token recebido (evita vazar segredo em log).
      throw new UnauthorizedException('Token inválido.');
    }

    // Repassa o MESMO token recebido na query (o n8n valida `query.token`).
    const url =
      destino +
      (destino.includes('?') ? '&' : '?') +
      'token=' +
      encodeURIComponent(token ?? '');

    let res: Response;
    try {
      res = await fetchComTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload ?? {}),
        },
        this.env.llmTimeoutMs,
      );
    } catch (e) {
      // Timeout (AbortError) ou rede: não pendura a request do Evolution — 503
      // sinaliza ao Evolution que ele pode reentregar (at-least-once).
      this.logger.error(`Falha ao repassar webhook pro n8n: ${(e as Error).message}`);
      throw new ServiceUnavailableException('n8n indisponível.');
    }

    if (!res.ok) {
      this.logger.error(`n8n respondeu ${res.status} ao repasse do webhook.`);
      throw new ServiceUnavailableException(`n8n retornou ${res.status}.`);
    }

    return { status: 'ok' };
  }
}
