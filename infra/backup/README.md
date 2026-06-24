# Backup & Restore — Postgres do Nina (SPEC-009 / premortem #2)

> Produto é **livro-caixa** → perda total de dados é o pior cenário. **Backup não testado = sem backup.**

## Scripts
- `backup.sh` — `pg_dump` → `gzip` → arquivo timestampado em `$BACKUP_DIR`, com retenção e off-site opcional. Falha ruidosa.
- `restore.sh <arquivo.sql.gz> [DATABASE_URL_ALVO]` — restaura (⚠️ sobrescreve o alvo). Use **primeiro num banco de teste**.

## Variáveis
| Env | Default | Nota |
|---|---|---|
| `DATABASE_URL` | — (obrigatório) | aponta p/ `nina_db:5432/nina` |
| `BACKUP_DIR` | `/backups` | **precisa ser volume PERSISTENTE** (senão some no restart) |
| `RETENTION_DAYS` | `14` | apaga dumps locais mais velhos |
| `BACKUP_S3_URL` | — | off-site opcional (S3/MinIO); requer `aws-cli` + credenciais |
| `AWS_ENDPOINT_URL` | — | p/ MinIO/S3-compatível |

## Agendar no EasyPanel (o Tiago faz)
1. Garantir um **volume persistente** montado em `/backups` (ou onde apontar `BACKUP_DIR`).
2. Criar uma **Scheduled Task** (cron, ex. `0 3 * * *`) que rode `backup.sh` com a `DATABASE_URL` interna do `nina_db`. Em imagem com `postgresql-client` (tem `pg_dump`/`psql`).
3. (Recomendado) Apontar `BACKUP_S3_URL` p/ um bucket **off-site** — se a VPS morrer, o backup sobrevive.

## TESTAR o restore (não pular!)
1. Sobe um Postgres de teste (container efêmero).
2. `./restore.sh /backups/nina-AAAAMMDD-HHMMSS.sql.gz postgres://...teste...`
3. Valida: contagens das tabelas, login do owner, últimas movimentações.

## RPO/RTO (alvo inicial)
- **RPO** (perda máx.): 24h (backup diário) → reduzir p/ horário/PITR se houver dados reais de cliente.
- **RTO** (tempo de volta): minutos (restore de 1 dump). Documentar o passo-a-passo aqui após o 1º teste.

## Futuro
- Migrar p/ Postgres **gerenciado com PITR** (Neon/Supabase — já citados no `.env.example`) p/ RPO próximo de zero.
- `pg_dump` imediatamente **antes** de cada `migrate deploy` no boot (premortem #19).
