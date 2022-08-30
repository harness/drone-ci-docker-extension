#syntax=docker/dockerfile:1.3-labs

FROM golang:1.18-alpine AS builder
ENV CGO_ENABLED=0
RUN apk add --update make git
WORKDIR /build
COPY go.* .
RUN go install github.com/goreleaser/goreleaser@latest 
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    make bin-all

FROM --platform=$BUILDPLATFORM node:17.7-alpine3.14 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build

FROM alpine AS dl

RUN apk add --update --no-cache curl \
    && mkdir -p /tools/darwin/amd64 /tools/darwin/arm64 \
    && mkdir -p /tools/linux/amd64 /tools/linux/arm64 \
    && mkdir -p /tools/windows/amd64

# Download yq
RUN curl -sL https://github.com/mikefarah/yq/releases/download/v4.25.3/yq_darwin_amd64 -o /tools/darwin/amd64/yq \
  &&  curl -sL https://github.com/mikefarah/yq/releases/download/v4.25.3/yq_darwin_arm64 -o /tools/darwin/arm64/yq \
  && chmod +x /tools/darwin/arm64/yq \
  && chmod +x /tools/darwin/amd64/yq

RUN curl -sL https://github.com/mikefarah/yq/releases/download/v4.25.3/yq_linux_amd64 -o /tools/linux/amd64/yq \
  &&  curl -sL https://github.com/mikefarah/yq/releases/download/v4.25.3/yq_linux_arm64 -o /tools/linux/arm64/yq \
  && chmod +x /tools/linux/arm64/yq \
  && chmod +x /tools/linux/amd64/yq 

RUN curl -sL https://github.com/mikefarah/yq/releases/download/v4.25.3/yq_windows_amd64 -o /tools/windows/amd64/yq.exe \
  && chmod +x /tools/windows/amd64/yq.exe
# End Download yq

FROM alpine
LABEL org.opencontainers.image.title="drone-desktop" \
    org.opencontainers.image.description="An extension to help developers do CI on their laptops using Drone" \
    org.opencontainers.image.vendor="Kamesh Sampath" \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    com.docker.extension.screenshots="" \
    com.docker.extension.detailed-description="" \
    com.docker.extension.publisher-url="" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.changelog=""

ARG TARGETARCH

RUN apk add --update --no-cache jq bash

COPY --from=builder /build /build
COPY --from=dl /tools /tools

COPY ./drone-cli /build

## Copy Drone CLI
RUN <<EOT
  cp /build/drone-cli/darwin/$TARGETARCH/drone /tools/darwin/drone
  chmod +x /tools/darwin/drone
  cp /build/drone-cli/linux/$TARGETARCH/drone /tools/linux/drone
  chmod +x /tools/linux/drone
  if [ "$TARGETARCH" == "amd64" ];
  then
      cp /build/drone-cli/windows/$TARGETARCH/drone.exe /tools/windows/drone.exe
  fi
EOT

## Copy yq
RUN <<EOT
    cp /tools/darwin/$TARGETARCH/yq /tools/darwin/yq
    cp /tools/linux/$TARGETARCH/yq /tools/linux/yq
    if [ "$TARGETARCH" == "amd64" ];
    then
      cp /tools/windows/$TARGETARCH/yq.exe /tools/windows/yq.exe
    fi
EOT

## Copy pipelines-finder
RUN <<EOT
    jq -r --arg target_arch $TARGETARCH  '.[] | select(.name=="pipelines-finder" and .goos=="darwin" and .goarch==$target_arch) | .path' /build/dist/artifacts.json > /tmp/toolfile
    cp $(cat /tmp/toolfile) /tools/darwin/pipelines-finder
    chmod +x /tools/darwin/pipelines-finder
    jq -r --arg target_arch $TARGETARCH  '.[] | select(.name=="pipelines-finder" and .goos=="linux" and .goarch==$target_arch) | .path' /build/dist/artifacts.json > /tmp/toolfile
    cp $(cat /tmp/toolfile) /tools/linux/pipelines-finder
    chmod +x /tools/linux/pipelines-finder
    jq -r --arg target_arch $TARGETARCH  '.[] | select(.name=="pipelines-finder.exe" and .goos=="windows" and .goarch==$target_arch) | .path' /build/dist/artifacts.json > /tmp/toolfile
    cp $(cat /tmp/toolfile) /tools/windows/pipelines-finder.exe
    chmod +x /tools/windows/pipelines-finder.exe
EOT

# COPY backend service
RUN <<EOT
    jq -r --arg target_arch $TARGETARCH  '.[] | select(.name=="backend" and .goos=="linux" and .goarch==$target_arch) | .path' /build/dist/artifacts.json > /tmp/backendfile.txt
    cp $(cat /tmp/backendfile.txt) /backend
    chmod +x /backend
EOT

COPY docker-compose.yaml .
COPY metadata.json .
COPY *.svg .

COPY --from=client-builder /ui/build ui
COPY scripts/run-drone.sh /tools/run-drone

RUN mkdir -p /data \
   && rm -rf /build

CMD /backend -socket /run/guest-services/extension-drone-desktop.sock
