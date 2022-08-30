#! /usr/bin/env bash

set -euxo pipefail


drone secret rm --name destination_image "harness/drone-desktop-docker-extension"

drone secret rm --name image_registry "harness/drone-desktop-docker-extension"
