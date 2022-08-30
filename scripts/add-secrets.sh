#! /usr/bin/env bash

set -euo pipefail

drone secret add --name destination_image --data "docker.io/harness/drone-desktop-docker-extension" "harness/drone-desktop-docker-extension"

drone secret add --name github_token --data "$HARNESS_CI_PAT" "harness/drone-desktop-docker-extension"

drone secret add --name image_registry --data "docker.io" "harness/drone-desktop-docker-extension"
