#!/usr/bin/env bash
set -euo pipefail

IMAGE="dannyswat/pjeasy"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>"
  echo "  Example: $0 1.0.0"
  exit 1
fi

VERSION="$1"

echo "Building and pushing ${IMAGE}:${VERSION} ..."

docker buildx build \
  --platform linux/arm64,linux/amd64 \
  -t "${IMAGE}:${VERSION}" \
  -t "${IMAGE}:latest" \
  --push \
  .

echo "Done. Pushed ${IMAGE}:${VERSION} and ${IMAGE}:latest"
