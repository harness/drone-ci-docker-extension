package main

import (
	"flag"
	"io/ioutil"
	"net"
	"os"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/handler"
	echo "github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
)

func main() {
	var socketPath, dbPath string
	flag.StringVar(&socketPath, "socket", "/run/guest/volumes-service.sock", "Unix domain socket to listen on")
	flag.StringVar(&dbPath, "dbPath", "/data/db.json", "File to store the Drone Pipeline Info")
	flag.Parse()

	os.RemoveAll(socketPath)

	log := log.New()

	log.Infof("Starting listening on %s\n", socketPath)
	router := echo.New()
	router.HideBanner = true

	startURL := ""

	ln, err := listen(socketPath)
	if err != nil {
		log.Fatal(err)
	}
	router.Listener = ln

	//Create the DB file
	_, err = os.Stat(dbPath)
	if os.IsNotExist(err) {
		log.Infof("%s does dot exist creating ", dbPath)
		if _, err := os.Create(dbPath); err != nil {
			log.Fatal(err)
		}

		ioutil.WriteFile(dbPath, []byte("[]"), 0600)
	} else if err != nil {
		log.Fatal(err)
	}

	h, err := handler.NewHandler(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	router.GET("/pipelines", h.GetPipelines)
	router.POST("/pipeline", h.SavePipelines)
	router.POST("/pipelines/delete", h.DeletePipelines)
	router.DELETE("/pipeline/:id", h.DeletePipeline)

	log.Fatal(router.Start(startURL))
}

func listen(path string) (net.Listener, error) {
	return net.Listen("unix", path)
}
