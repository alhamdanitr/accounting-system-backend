#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV="${NODE_ENV:-test}"
export DATABASE_URL="${DATABASE_URL:-postgresql://accounting:accounting_dev_password@localhost:5432/accounting_system?schema=public}"

pnpm exec prisma migrate deploy
pnpm exec jest --config ./test/jest-e2e.json --runInBand "$@"
