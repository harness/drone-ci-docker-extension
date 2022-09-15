package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/harness/drone-ci-docker-extension/pkg/db"
	"github.com/harness/drone-ci-docker-extension/pkg/ignore"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

func main() {
	var directory string
	var stages db.Stages

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
			for {
				stage := new(db.Stage)
				stage.PipelineFile = path
				stage.PipelinePath = filepath.Dir(path)
				stage.Logs = []byte("")
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
				stages = append(stages, stage)
			}
		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}
	sort.Sort(stages)
	b, err := json.Marshal(stages)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf(string(b))
}
