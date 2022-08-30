# hello-world Project

This project uses Quarkus, the Supersonic Subatomic Java Framework.

If you want to learn more about Quarkus, please visit its website: https://quarkus.io/ .

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:
```shell script
./mvnw compile quarkus:dev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at http://localhost:8080/q/dev/.

## Packaging and running the application

Start the k3s cluster using k3d,

```shell
./runCluster.sh
```

Start drone pipeline to build and deploy the applications kubernetes,

```shell
drone exec --network=<any network> --trusted 
```

Test the application,

```shell
curl localhost:8080
```