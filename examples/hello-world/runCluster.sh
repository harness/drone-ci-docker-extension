#! /usr/bin/env bash

set -euo pipefail

k3d registry create myregistry.localhost \
  --port 5001 \
  --default-network=nexus3_nexus
k3d cluster create my-demos \
  --registry-use k3d-myregistry.localhost:5001 \
  --port "127.0.0.1:30080:30080@loadbalancer" \
  --network=nexus3_nexus