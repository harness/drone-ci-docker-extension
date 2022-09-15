package monitor

import (
	"context"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/harness/drone-ci-docker-extension/pkg/handler"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

//Config configures the monitor to initialize
type Config struct {
	Ctx           context.Context
	Log           *logrus.Logger
	DockerCli     *client.Client
	DB            *bun.DB
	LogsPath      string
	MonitorErrors chan error
	filters       filters.Args
	Handler       *handler.Handler
}

type Monitor interface {
	MonitorAndLog()
}

type Option func(*Config)

const (
	labelPipelineFile = "io.drone.desktop.pipeline.file"
	labelIncludes     = "io.drone.desktop.pipeline.includes"
	labelExcludes     = "io.drone.desktop.pipeline.excludes"
	labelStageName    = "io.drone.stage.name"
	labelStepName     = "io.drone.step.name"
)
