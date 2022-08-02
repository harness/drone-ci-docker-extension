IMAGE?=kameshsampath/drone-desktop-extension
TAG?=latest
VOLUME_NAME=drone-desktop-data

BUILDER=buildx-multi-arch

STATIC_FLAGS=CGO_ENABLED=0
LDFLAGS="-s -w"
GO_BUILD=$(STATIC_FLAGS) go build -trimpath -ldflags=$(LDFLAGS)

INFO_COLOR = \033[0;36m
NO_COLOR   = \033[m

bin:	## Build binaries
	goreleaser build --snapshot --rm-dist --single-target --debug

bin-all:	## Build binaries for all targetted architectures
	goreleaser build --snapshot --rm-dist

build-extension: ## Build service image to be deployed as a desktop extension
	docker build --tag=$(IMAGE):$(TAG) .

install-extension: build-extension ## Install the extension
	docker volume create $(VOLUME_NAME)
	docker extension install $(IMAGE):$(TAG)

uninstall-extension:	## Uninstall the extension
		docker extension rm $(IMAGE):$(TAG)

update-extension: build-extension ## Update the extension
	docker extension update $(IMAGE):$(TAG)

prepare-buildx: ## Create buildx builder for multi-arch build, if not exists
	docker buildx inspect $(BUILDER) || docker buildx create --name=$(BUILDER) --driver=docker-container --driver-opt=network=host

push-extension: prepare-buildx ## Build & Upload extension image to hub. Do not push if tag already exists: TAG=$(shell svu c) make push-extension
	docker pull $(IMAGE):$(shell svu c) && echo "Failure: Tag already exists" || docker buildx build --push --builder=$(BUILDER) --platform=linux/amd64,linux/arm64 --build-arg TAG=$(shell svu c) --tag=$(IMAGE):$(shell svu c) .

release-beta:	# Create a new beta release
	git tag "$(shell svu next --suffix beta)"
	git push --tags
	goreleaser --rm-dist

release:	# Create a new release
	git tag "$(shell svu next)"
	git push --tags
	goreleaser --rm-dist

help: ## Show this help
	@echo Please specify a build target. The choices are:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(INFO_COLOR)%-30s$(NO_COLOR) %s\n", $$1, $$2}'

tidy:	## Runs go mod tidy
	go mod tidy
	
test:	## Runs the test
	./hack/test.sh

vendor:	## Vendoring
	go mod vendor

lint:	## Run lint on the project
	golangci-lint run

clean:	## Cleans output
	go clean
	rm -rf dist

.PHONY: bin extension push-extension help	tidy	test	vendor	lint	clean
