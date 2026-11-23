#!/usr/bin/env bash
# Applies every migration to a fresh database and runs the security tests.
# Needs a PostgreSQL 15+ server; pass connection settings via PG* variables,
# e.g.  PGHOST=/tmp PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=pause_pray_test_$$
psql -q -v ON_ERROR_STOP=1 -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/supabase_shim.sql
for f in migrations/*.sql; do
  echo "migration: $f"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
for t in tests/*.test.sql; do
  echo "test: $t"
  psql -q -v ON_ERROR_STOP=1 -o /dev/null -d "$DB" -f "$t"
done
echo "All database tests passed."
