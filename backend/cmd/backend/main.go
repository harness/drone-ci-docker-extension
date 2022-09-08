package main

import (
	"context"
	"flag"
	"net"
	"os"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/handler"
	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/utils"
	echo "github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

func main() {

	var log *logrus.Logger
	var err error
	var socketPath, v, dbFile string

	flag.StringVar(&socketPath, "socket", "/run/guest/volumes-service.sock", "Unix domain socket to listen on")
	flag.StringVar(&dbFile, "dbPath", utils.LookupEnvOrString("DB_FILE", "/data/db"), "File to store the Drone Pipeline Info")
	flag.StringVar(&v, "level", utils.LookupEnvOrString("LOG_LEVEL", logrus.WarnLevel.String()), "The log level to use. Allowed values trace,debug,info,warn,fatal,panic.")
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
	router.GET("/stages", h.GetStages)
	router.POST("/stages", h.SaveStages)
	router.PATCH("/stage/:id/:status", h.UpdateStageStatus)
	router.PATCH("/step/:id/:status", h.UpdateStepStatus)
	router.DELETE("/stages", h.DeleteStages)
	//TODO stream
	router.GET("/stage/:id/logs", h.StageLogs)

	log.Fatal(router.Start(startURL))
}

func listen(path string) (net.Listener, error) {
	return net.Listen("unix", path)
}
