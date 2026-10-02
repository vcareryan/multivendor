#!/bin/bash
# Creates the NON-privileged application role used at runtime. Because this role
# is NOT a superuser and does NOT have BYPASSRLS, PostgreSQL Row-Level Security
# applies to every query it runs — enforcing tenant isolation at the DB layer.
# (Table privileges are granted later by prisma/rls.sql once tables exist.)
set -e

APP_USER="${APP_DB_USER:-utan_app}"
APP_PASS="${APP_DB_PASSWORD:-app_password}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_USER}') THEN
      CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_USER};
  END
  \$\$;
EOSQL

echo "Created runtime role ${APP_USER} (RLS-enforced)."
