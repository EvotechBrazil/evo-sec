#!/bin/sh
# Boot da API: aplica migrações e seed (idempotente) e sobe o servidor.
set -e

echo "[entrypoint] prisma migrate deploy..."
yarn prisma migrate deploy

echo "[entrypoint] seed (idempotente)..."
yarn prisma:seed || echo "[entrypoint] seed falhou (seguindo mesmo assim)"

echo "[entrypoint] iniciando API (node dist/main)..."
exec node dist/main
