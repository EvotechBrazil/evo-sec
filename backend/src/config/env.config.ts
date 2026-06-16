/**
 * Validação e tipagem das variáveis de ambiente.
 * Segredos NUNCA são hardcoded — apenas lidos do ambiente (DEV OS regra 9).
 */
export interface AppEnv {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  encryptionKey: string;
  serviceToken: string;
}

const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'SERVICE_TOKEN',
] as const;

export function loadEnv(): AppEnv {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }
  if ((process.env.ENCRYPTION_KEY ?? '').length !== 32) {
    throw new Error('ENCRYPTION_KEY deve ter exatamente 32 caracteres (AES-256-GCM).');
  }
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.APP_PORT ?? 3001),
    apiPrefix: process.env.API_PREFIX ?? '/api/v1',
    databaseUrl: process.env.DATABASE_URL as string,
    jwtSecret: process.env.JWT_SECRET as string,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    encryptionKey: process.env.ENCRYPTION_KEY as string,
    serviceToken: process.env.SERVICE_TOKEN as string,
  };
}
