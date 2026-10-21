#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
image=${1:?Pass the immutable GHCR sha image tag}
[[ "$image" =~ ^ghcr.io/[a-z0-9._/-]+:sha-[a-f0-9]{40}$ ]] || { echo 'Invalid image tag'; exit 1; }
exec 9>deploy/operation.lock
flock -w 600 9
# Download first; a network failure must not stop the running application.
docker pull "$image"
old_id=$(bash deploy/compose.sh ps -q app)
[[ -n "$old_id" ]] || { echo 'Use the documented first-start procedure before updating'; exit 1; }
old_image=$(docker inspect --format '{{.Config.Image}}' "$old_id")
bash deploy/compose.sh stop app
# The old image understands the old schema; no new migrations run until this succeeds.
if ! DND_IMAGE="$old_image" bash deploy/compose.sh run --rm --no-deps backup scripts/backup-rotate.mjs /data/companion.db /backups predeploy; then
  echo 'Backup failed: update cancelled; restarting the unchanged container'
  bash deploy/compose.sh start app
  exit 1
fi
umask 077
printf '%s\n' "$old_image" > deploy/previous-image.txt
if ! DND_IMAGE="$image" bash deploy/compose.sh up -d --no-deps --wait --wait-timeout 180 app; then
  DND_IMAGE="$image" bash deploy/compose.sh stop app
  echo 'New version failed readiness. Application stopped; restore the predeploy backup into a fresh volume with the previous image (docs/VPS.md). No automatic schema rollback.'
  exit 1
fi
# Persist only after readiness passes. Keep credentials out of process output.
temporary=$(mktemp ./deployment.env.XXXXXX)
trap 'rm -f "$temporary"' EXIT
awk '!/^DND_IMAGE=/' deployment.env > "$temporary"
printf 'DND_IMAGE=%s\n' "$image" >> "$temporary"
chmod 600 "$temporary"
mv "$temporary" deployment.env
echo 'Deployment healthy; image saved in deployment.env'
