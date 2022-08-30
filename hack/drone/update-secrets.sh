#! /usr/bin/env bash

set -euxo pipefail

drone secret update --name github_token --data "${GITHUB_TOKEN}" "${DDE_DRONE_REPO}"

drone secret update --name destination_image --data "${REPO}" "${DDE_DRONE_REPO}"

drone secret update --name image_registry --data "${REGISTRY_NAME}" "${DDE_DRONE_REPO}"

drone secret update --name image_registry_user --data "${IMAGE_REGISTRY_USER}" "${DDE_DRONE_REPO}"

drone secret update --name image_registry_password --data "${IMAGE_REGISTRY_PASSWORD}" "${DDE_DRONE_REPO}"