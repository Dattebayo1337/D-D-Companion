#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
args=(--env-file deployment.env -f compose.vps.yaml)
# Create this non-secret marker only for a containerized Caddy.
if [[ -f deploy/use-proxy-network ]]; then args+=(-f compose.vps.network.yaml); fi
docker compose "${args[@]}" "$@"
