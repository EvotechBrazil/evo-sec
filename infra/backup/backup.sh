#!/usr/bin/env bash
#
# Backup do Postgres do Nina (SPEC-009 / premortem #2).
# pg_dump -> gzip -> arquivo timestampado, com retenção e off-site opcional.
# Falha RUIDOSAMENTE (set -euo pipefail) — backup que falha em silêncio = sem backup.
#
# Uso: DATABASE_URL=postgres://... ./backup.sh
# Agende no EasyPanel como "Scheduled Task" diária (ver README.md).
#
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL ausente — aponte para o Postgres de produção (nina_db:5432/nina)}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"     # IMPORTANTE: volume PERSISTENTE (senão some no restart)
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/nina-${TS}.sql.gz"

echo "[backup] iniciando pg_dump -> ${FILE}"
# --no-owner/--no-privileges deixam o dump portável p/ restaurar em outro role.
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$FILE"

# Sanidade: dump vazio/curto = falha (pg_dump pode sair 0 com erro de pipe).
SIZE_BYTES="$(wc -c < "$FILE")"
if [ "$SIZE_BYTES" -lt 1024 ]; then
  echo "[backup] ERRO: dump suspeito (${SIZE_BYTES} bytes) — abortando." >&2
  exit 1
fi
echo "[backup] ok — $(du -h "$FILE" | cut -f1)"

# Off-site opcional (S3/MinIO). Requer aws-cli + credenciais no ambiente.
if [ -n "${BACKUP_S3_URL:-}" ]; then
  echo "[backup] enviando off-site -> ${BACKUP_S3_URL}"
  # Off-site é bônus: se falhar, NÃO derruba o backup (o local já está gravado e validado).
  if aws s3 cp "$FILE" "${BACKUP_S3_URL%/}/" ${AWS_ENDPOINT_URL:+--endpoint-url "$AWS_ENDPOINT_URL"}; then
    echo "[backup] off-site ok"
  else
    echo "[backup] AVISO: off-site falhou — backup local preservado em ${FILE}" >&2
  fi
fi

# Retenção: remove dumps locais mais velhos que RETENTION_DAYS.
find "$BACKUP_DIR" -maxdepth 1 -name 'nina-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[backup] concluído (${TS}); retenção=${RETENTION_DAYS}d"
