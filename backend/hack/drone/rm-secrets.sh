#! /usr/bin/env bash

set -euxo pipefail

drone secret rm --name github_token "${DDE_DRONE_REPO}"

drone secret rm --name destination_image "${DDE_DRONE_REPO}"

drone secret rm --name image_registry "${DDE_DRONE_REPO}"

drone secret rm --name image_registry_user "${DDE_DRONE_REPO}"

drone secret rm --name image_registry_password "${DDE_DRONE_REPO}"