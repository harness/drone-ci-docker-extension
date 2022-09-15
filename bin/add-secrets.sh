#! /usr/bin/env bash

set -euo pipefail

drone secret add --name destination_image --data "docker.io/drone/drone-ci-docker-extension" "harness/drone-ci-docker-extension"

drone secret add --name extn_github_token --data "$DRONEIO_CI_PAT" "harness/drone-ci-docker-extension"

drone secret add --name image_registry --data "docker.io" "harness/drone-ci-docker-extension"
