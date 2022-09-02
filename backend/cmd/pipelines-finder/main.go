package main

import (
	"crypto/md5"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/ignore"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type DronePipeline struct {
	ID           string `json:"id"`
	PipelineName string `json:"pipelineName"`
	PipelinePath string `json:"pipelinePath"`
	PipelineFile string `json:"pipelineFile"`
}

func main() {

	var dronePipelines []DronePipeline

	var directory string

	flag.StringVar(&directory, "path", "", "Root Path to discover drone pipelines")
	flag.Parse()

	if directory == "" {
		log.Fatal("Require base directory to discover pipelines. Run the command with e.g. pipelines-finder -path <base dir path>")
	}

	ignorer, err := ignore.NewOrDefault(directory)

	if err != nil {
		log.Fatal(err)
	}

	err = filepath.Walk(directory, func(path string, fi os.FileInfo, err error) error {

		if err != nil {
			fmt.Println(err)
			return nil
		}
		var ignorable ignore.Ignorable
		if ignorable, err = ignorer.CanIgnore(path, fi); err != nil {
			return err
		}

		switch ignorable {
		case ignore.Transitive:
			return filepath.SkipDir
		case ignore.Current:
			return nil
		}

		// Chase symlinks.
		info, err := os.Stat(path)
		if err != nil {
			return err
		}

		if !info.IsDir() && strings.HasSuffix(path, ".drone.yml") {
			pipelineName, err := pipelineName(path)
			if err != nil {
				log.Fatal(err)
			}
			dronePipeline := DronePipeline{
				ID:           generateId(filepath.Dir(path)),
				PipelinePath: filepath.Dir(path),
				PipelineFile: path,
				PipelineName: pipelineName,
			}
			dronePipelines = append(dronePipelines, dronePipeline)
		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	b, err := json.Marshal(dronePipelines)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf(string(b))

}

func pipelineName(path string) (string, error) {
	var yml map[string]interface{}
	b, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}

	err = yaml.Unmarshal(b, &yml)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s", yml["name"]), nil
}

func generateId(path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(path)))
}
