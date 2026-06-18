# Frontend (Next.js 14) — imagem de produção para EasyPanel.
# Build context = ./frontend (source path "/frontend").
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* é inlined no build do Next. Default aponta para a API pública;
# pode ser sobrescrito via build arg no EasyPanel.
ARG NEXT_PUBLIC_API_URL=https://nina-api.rte6ms.easypanel.host/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
