package monitor

import (
	"context"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/handler"
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
	ATTR_PIPELINE_DIR = "io.drone.desktop.pipeline.dir"
	ATTR_STAGE_NAME   = "io.drone.stage.name"
	ATTR_STEP_NAME    = "io.drone.step.name"
)
