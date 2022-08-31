#! /usr/bin/env bash

set -euo pipefail

drone secret rm --name extn_github_token "harness/drone-desktop-docker-extension"
drone secret rm --name destination_image "harness/drone-desktop-docker-extension"
drone secret rm --name image_registry "harness/drone-desktop-docker-extension"
