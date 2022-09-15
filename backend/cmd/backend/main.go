package main

import (
	"context"
	"flag"
	"net"
	"os"
	"path"
	"path/filepath"

	"github.com/harness/drone-ci-docker-extension/pkg/handler"
	"github.com/harness/drone-ci-docker-extension/pkg/monitor"
	"github.com/harness/drone-ci-docker-extension/pkg/utils"
	echo "github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

func main() {
	var log *logrus.Logger
	var err error
	var socketPath, v, dbFile string

	flag.StringVar(&socketPath, "socket", "/run/guest/volumes-service.sock", "Unix domain socket to listen on")
	flag.StringVar(&dbFile, "dbPath", utils.LookupEnvOrString("DB_FILE", "/data/db"), "File to store the Drone Pipeline Info")
	//TODO revert to warn after testing
	flag.StringVar(&v, "level", utils.LookupEnvOrString("LOG_LEVEL", logrus.DebugLevel.String()), "The log level to use. Allowed values trace,debug,info,warn,fatal,panic.")
	flag.Parse()

	os.RemoveAll(socketPath)

	log = utils.LogSetup(os.Stdout, v)

	log.Infof("Starting listening on %s\n", socketPath)
	router := echo.New()
	router.HideBanner = true

	startURL := ""

	ln, err := listen(socketPath)
	if err != nil {
		log.Fatal(err)
	}
	router.Listener = ln

	//Init DB
	ctx := context.Background()

	h := handler.NewHandler(ctx, dbFile, log)

	//Routes
	router.GET("/stages", h.GetStages)
	router.GET("/stage/:id", h.GetStage)
	router.GET("/stage/:pipelineFile", h.GetStagesByPipelineFile)
	router.POST("/stages", h.SaveStages)
	router.PATCH("/stage/:id/:status", h.UpdateStageStatus)
	router.PATCH("/step/:id/:status", h.UpdateStepStatus)
	router.DELETE("/stages", h.DeleteAllStages)
	router.DELETE("/stages/:id", h.DeleteStage)
	router.DELETE("/pipeline/:pipelineFile", h.DeletePipeline)
	//TODO stream
	router.GET("/stage/:id/logs", h.StageLogs)

	//Start the monitor to monitor pipeline
	//Save logs and update statuses
	logsPath := path.Join(filepath.Dir(dbFile), "logs")
	log.Infof("Saving pipeline logs in %s\n", logsPath)
	cfg, err := monitor.New(h.DatabaseConfig.Ctx,
		h.DatabaseConfig.DB,
		h.DatabaseConfig.Log, monitor.WithLogsPath(logsPath))

	if err != nil {
		log.Fatal(err)
	} else {
		go cfg.MonitorAndLog()
	}

	log.Fatal(router.Start(startURL))
	for {
		errCh := <-cfg.MonitorErrors
		log.Error(errCh.Error())
	}
}

func listen(path string) (net.Listener, error) {
	return net.Listen("unix", path)
}
