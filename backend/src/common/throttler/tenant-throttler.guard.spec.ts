import { Reflector } from '@nestjs/core';
import {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { runWithTenant } from '../tenant/tenant-context';
import { TenantThrottlerGuard } from './tenant-throttler.guard';

/**
 * Subclasse só de teste que reabre o `getTracker` (protected) para asserção
 * direta, sem precisar simular o ciclo completo do guard nem carga real.
 */
class TestableGuard extends TenantThrottlerGuard {
  public callGetTracker(req: Record<string, unknown>): Promise<string> {
    return this.getTracker(req);
  }
}

describe('TenantThrottlerGuard.getTracker', () => {
  const options: ThrottlerModuleOptions = [{ ttl: 60_000, limit: 120 }];
  const storage = {} as ThrottlerStorage;
  let guard: TestableGuard;

  beforeEach(() => {
    guard = new TestableGuard(options, storage, new Reflector());
  });

  it('usa o tenantId quando há contexto de tenant (req autenticada)', async () => {
    const req = { ip: '10.0.0.1' };
    const tracker = await runWithTenant({ tenantId: 'tenant-abc' }, () =>
      guard.callGetTracker(req),
    );
    expect(tracker).toBe('tenant-abc');
  });

  it('cai para o req.ip quando não há contexto de tenant (anônima/login)', async () => {
    const tracker = await guard.callGetTracker({ ip: '203.0.113.7' });
    expect(tracker).toBe('203.0.113.7');
  });
});
