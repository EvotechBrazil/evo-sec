# Backend (NestJS + Prisma) — imagem de produção para EasyPanel.
# Build context = ./backend (source path "/backend" no EasyPanel).
FROM node:20-bookworm-slim

# openssl: requerido pelo Prisma. build-essential/python3: compilar bcrypt (módulo nativo).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala TODAS as deps (inclui dev: prisma CLI, ts-node p/ seed, nest CLI p/ build).
# NODE_ENV não é "production" aqui de propósito, senão o yarn pula as devDependencies.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma generate && yarn build

ENV NODE_ENV=production
EXPOSE 3001

# Entrypoint roda migrate deploy + seed (idempotente) antes de subir a API.
RUN chmod +x ./docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
