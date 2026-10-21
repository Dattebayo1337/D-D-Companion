#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec 9>deploy/operation.lock
flock -w 300 9
bash deploy/compose.sh run --rm --no-deps backup scripts/backup-rotate.mjs /data/companion.db /backups "${1:-scheduled}"
