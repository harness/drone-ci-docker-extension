package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/harness/drone-ci-docker-extension/pkg/ignore"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type Stage struct {
	PipelineFile string    `json:"pipelineFile"`
	PipelinePath string    `json:"pipelinePath"`
	Name         string    `json:"name"`
	Steps        []Step    `json:"steps"`
	Services     []Service `json:"-"`
}

type Step struct {
	Name    string `json:"name"`
	Image   string `json:"image"`
	Service int    `json:"isService"`
}

type Service struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

type Stages []*Stage

func main() {
	var directory string
	var stages Stages

	flag.StringVar(&directory, "path", "", "Root Path to discover drone pipelines")
	flag.Parse()

	if directory == "" {
		log.Fatal("Require base directory to discover pipelines. Run the command with e.g. pipelines-finder -path <base dir path>")
	}

	ignorer, err := ignore.NewOrDefault(directory)

	if err != nil {
		log.Fatal(err)
	}

	//TODO use WalkDir
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
			for {
				stage := new(Stage)
				stage.PipelineFile = path
				stage.PipelinePath = filepath.Dir(path)
				err := decoder.Decode(stage)
				if stage == nil {
					continue
				}
				if errors.Is(err, io.EOF) {
					break
				}
				if err != nil {
					log.Fatal(err)
				}
				for _, svc := range stage.Services {
					stage.Steps = append(stage.Steps, Step{
						Name:    svc.Name,
						Image:   svc.Image,
						Service: 1,
					})
				}
				stages = append(stages, stage)
			}
		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}
	//sort.Sort(stages)
	b, err := json.Marshal(stages)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf(string(b))
}
