package main

import (
	"crypto/md5"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/ignore"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type DronePipelineStep struct {
	Name  string `yaml:"name" json:"name"`
	Image string `yaml:"image" json:"image"`
}

type DronePipeline struct {
	ID           string              `yaml:"id" json:"id"`
	PipelineName string              `yaml:"name" json:"name"`
	PipelinePath string              `yaml:"pipelinePath,omitempty" json:"pipelinePath,omitempty"`
	PipelineFile string              `yaml:"pipelineFile,omitempty" json:"pipelineFile,omitempty"`
	Steps        []DronePipelineStep `yaml:"steps" json:"steps"`
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
			if err != nil {
				log.Fatal(err)
			}

			file, err := os.Open(path)
			if err != nil {
				log.Fatal(err)
			}
			decoder := yaml.NewDecoder(file)
			dronePipeline := new(DronePipeline)
			for {
				err := decoder.Decode(dronePipeline)
				if dronePipeline == nil {
					continue
				}
				if errors.Is(err, io.EOF) {
					break
				}
				if err != nil {
					log.Fatal(err)
				}
				dronePipeline.PipelineFile = path
				dronePipeline.PipelinePath = filepath.Dir(path)
				dronePipeline.ID = generateID(dronePipeline.PipelineName, path)
				dronePipelines = append(dronePipelines, *dronePipeline)
			}
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

func generateID(stageName, path string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(fmt.Sprintf("%s|%s", stageName, path))))
}
