#!/usr/bin/env bash
#
# Restore de um backup do Nina (SPEC-009 / premortem #2).
# ⚠️ SOBRESCREVE o banco alvo. Restaure SEMPRE primeiro num banco de TESTE
#    e valide os dados antes de apontar a produção. Backup não testado = sem backup.
#
# Uso: ./restore.sh <arquivo.sql.gz> [DATABASE_URL_ALVO]
#   (se DATABASE_URL_ALVO omitido, usa $DATABASE_URL do ambiente)
#
set -euo pipefail

FILE="${1:?uso: restore.sh <arquivo.sql.gz> [DATABASE_URL_ALVO]}"
TARGET="${2:-${DATABASE_URL:?informe a DATABASE_URL alvo (arg 2 ou env)}}"

[ -f "$FILE" ] || { echo "[restore] arquivo não encontrado: $FILE" >&2; exit 1; }

if [ "$#" -lt 2 ]; then
  echo "[restore] AVISO: alvo não passado (arg 2) — usando \$DATABASE_URL do ambiente, que pode ser PRODUÇÃO!" >&2
fi
echo "[restore] ATENÇÃO: vou restaurar '${FILE}' no banco alvo (sobrescreve)."
echo "[restore] alvo: ${TARGET%%\?*}"   # esconde querystring/credenciais no log
echo "[restore] (Ctrl-C em 5s para abortar)"; sleep 5

gunzip -c "$FILE" | psql "$TARGET" -v ON_ERROR_STOP=1
echo "[restore] OK — VALIDE os dados (contagens, login, últimas movimentações) antes de usar."
