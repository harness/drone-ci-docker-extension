#! /usr/bin/env bash

set -euo pipefail

drone secret rm --name extn_github_token "harness/drone-ci-docker-extension"
drone secret rm --name destination_image "harness/drone-ci-docker-extension"
drone secret rm --name image_registry "harness/drone-ci-docker-extension"
