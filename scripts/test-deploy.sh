#!/usr/bin/env bash
set -euo pipefail
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/deploy" "$root/bin"
cp deploy/update.sh deploy/compose.sh "$root/deploy/"
cat > "$root/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$TRACE"
case "$*" in
  'pull '*) exit 0 ;;
  'inspect '*) echo ghcr.io/example/app:sha-1111111111111111111111111111111111111111 ;;
  *'ps -q app') echo test-container ;;
  *'run --rm --no-deps backup '*) [[ "$FAILURE" != backup ]] ;;
  *'up -d --no-deps --wait '*) [[ "$FAILURE" != readiness ]] ;;
esac
MOCK
chmod +x "$root/bin/docker"
export PATH="$root/bin:$PATH" TRACE="$root/trace"
image=ghcr.io/example/app:sha-2222222222222222222222222222222222222222
for failure in backup readiness none; do
  export FAILURE=$failure
  printf 'DND_IMAGE=old\nDND_HOST_KEY=keep-this-secret\n' > "$root/deployment.env"
  : > "$TRACE"
  if bash "$root/deploy/update.sh" "$image"; then
    [[ "$failure" == none ]]
    grep -q "DND_IMAGE=$image" "$root/deployment.env"
  else
    [[ "$failure" != none ]]
    grep -q '^DND_IMAGE=old$' "$root/deployment.env"
  fi
  grep -q '^DND_HOST_KEY=keep-this-secret$' "$root/deployment.env"
  if [[ "$failure" == backup ]]; then
    ! grep -q 'up -d' "$TRACE"
    grep -q 'start app' "$TRACE"
  fi
  if [[ "$failure" == readiness ]]; then
    [[ $(grep -c 'stop app' "$TRACE") == 2 ]]
    ! grep -q 'start app' "$TRACE"
  fi
done
echo 'Deployment failure paths verified'
