# Drone Desktop

A [Docker Desktop Extension](https://docs.docker.com/desktop/extensions/) to run and manage [drone pipelines](https://docs.drone.io/pipeline/overview/).

> WARNING: This extension is under active development and expect to undergo lots of change and refactoring

## Pre-requisites

- [Docker Desktop v4.8+](https://www.docker.com/products/docker-desktop/)



## Features

### Discover Drone Pipelines

Search and import existing Drone Pipelines, ideally these are project source folders that has `.drone.yml`:

![Import Pipelines](./docs/images/drone_desktop_feature_import.gif)

> __NOTE__: You can use the [examples](./examples) folder as the base directory to import few example pipelines.

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

## TODO

- [ ] [View Logs](https://github.com/kameshsampath/drone-desktop-docker-extension/issues/1)
- [ ] [Exec into running container](https://github.com/kameshsampath/drone-desktop-docker-extension/issues/2)
- [ ] [Use database for backend over JSON file](https://github.com/kameshsampath/drone-desktop-docker-extension/issues/3)

## Install Extension

```shell
docker volume create drone-desktop-data
docker extension install kameshsampath/drone-desktop-extension:v1.1.2
```

## Remove Extension

```shell
make uninstall-extension
```

__(OR)__

```shell
docker extension rm kameshsampath/drone-desktop-extension
```

Delete the volume,

```shell
docker volume rm drone-desktop-data
```

## Issues

We welcome your feedback and improvements. Please open an [issue](https://github.com/kameshsampath/drone-desktop-docker-extension/issues) for any bugs, feature requests

## Disclaimer

This is not an officially supported Harness product.
