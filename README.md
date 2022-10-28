# Drone Desktop

[![Build Status](https://harness.drone.io/api/badges/harness/drone-ci-docker-extension/status.svg?ref=refs/heads/main)](https://harness.drone.io/harness/drone-ci-docker-extension)

A [Docker Desktop Extension](https://docs.docker.com/desktop/extensions/) to run [Drone CI](https://drone.io) pipelines on your laptops.

> **WARNING**: This extension is under active development and expect to undergo lots of change and refactoring

## Pre-requisites

- [Docker Desktop v4.8+](https://www.docker.com/products/docker-desktop/)

## Features

### Discover Drone Pipelines

Search and import existing Drone Pipelines, ideally these are project source folders that has `.drone.yml`:

![Import Pipelines](./docs/images/drone_desktop_feature_import.gif)

> **NOTE**: You can use the [examples](./examples) folder as the base directory to import few example pipelines.

### Open Drone pipeline project in Visual Studio Code

It's easy to open your Drone Pipeline project in Visual Studio Code directly from the extension within Docker Desktop

![Open in Visual Studio Code](./docs/images/drone_desktop_feature_open_in_vs_code.gif)

### Running Pipelines

The extension allows you to run pipelines that have been imported using the "Import Pipelines".

### Running all steps

![Run all steps](./docs/images/drone_desktop_feature_run_pipelines_allsteps.gif)

### Run Steps in Trusted mode

![Run in Trusted mode](./docs/images/drone_desktop_feature_run_pipelines_trusted.gif)

### Run Specific Steps

![Run in Trusted mode](./docs/images/drone_desktop_feature_run_pipelines_include.gif)

### Run Pipelines with Environment File

![Run in Trusted mode](./docs/images/drone_desktop_feature_run_pipelines_with_env.gif)

### Run Pipelines with Secret File

![Run in Trusted mode](./docs/images/drone_desktop_feature_run_pipelines_with_secret.gif)

### Remove Pipelines

You can remove one or more Drone pipelines, removing does not physically delete but the pipeline is ignored by the extension watchers.

![Remove Pipelines](./docs/images/drone_desktop_feature_remove_pipelines.gif)

### Stop Pipelines

You can now stop any running pipeline, this operation will basically kill the associated drone process.

![Stop Pipelines](../docs/images/drone_desktop_feature_stop_pipelines.gif)

## Install Extension

```shell
docker extension install drone/drone-ci-docker-extension:latest
```

***IMPORTANT**: It is recommended to install the extension using Docker Extension Marketplace.

## Remove Extension

```shell
docker extension rm drone/drone-ci-docker-extension
```

## Documentation

- <https://docs.drone.io/>
- <https://docs.drone.io/quickstart/cli/>

## Issues

We welcome your feedback and improvements. Please open an [issue](https://github.com/harness/drone-ci-docker-extension/issues) for any bugs, feature requests.

## Questions

For any questions please use [discussions](https://github.com/harness/drone-ci-docker-extension/discussions) for questions/discussions.

## Disclaimer

This is not an officially supported Harness product.
