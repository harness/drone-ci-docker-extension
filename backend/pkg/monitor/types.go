package monitor

import (
	"context"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/harness/drone-ci-docker-extension/pkg/handler"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

// Config configures the monitor to initialize
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
	//LabelPipelineFile is to identify the pipeline file
	LabelPipelineFile = "io.drone.desktop.pipeline.file"
	//LabelIncludes is to hold list of included steps as comma separated string
	LabelIncludes = "io.drone.desktop.pipeline.includes"
	//LabelExcludes is to hold list of excluded steps as comma separated string
	LabelExcludes = "io.drone.desktop.pipeline.excludes"
	//LabelStageName is to identify the stage name
	LabelStageName = "io.drone.stage.name"
	//LabelStepName is to identify the step name
	LabelStepName = "io.drone.step.name"
	//LabelStepNumber is to identify the step number
	LabelStepNumber = "io.drone.step.number"
	//LabelService to identify if the step is a "Service"
	LabelService = "io.drone.desktop.pipeline.service"
)
