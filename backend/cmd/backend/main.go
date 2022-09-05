package main

import (
	"context"
	"flag"
	"net"
	"os"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"
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

	log, err = utils.LogSetup(os.Stdout, v)
	if err != nil {
		panic(err)
	}

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
	db := db.New(ctx, log, dbFile)
	db.Init()

	// h, err := handler.NewHandler(dbPath)
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// router.GET("/pipelines", h.GetPipelines)
	// router.POST("/pipeline", h.SavePipelines)
	// router.POST("/pipelines/delete", h.DeletePipelines)
	// router.DELETE("/pipeline/:id", h.DeletePipeline)

	log.Fatal(router.Start(startURL))
}

func listen(path string) (net.Listener, error) {
	return net.Listen("unix", path)
}
