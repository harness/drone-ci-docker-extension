package monitor

import (
	"context"
	"crypto/md5"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"
	"github.com/labstack/gommon/log"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

var (
	_ Monitor = (*Config)(nil)
)

func WithFilters(eventFilters filters.Args) Option {
	return func(c *Config) {
		c.filters = eventFilters
	}
}

func WithLogsPath(logsPath string) Option {
	return func(c *Config) {
		c.LogsPath = logsPath
	}
}

func New(ctx context.Context, db *bun.DB, log *logrus.Logger, options ...Option) (*Config, error) {
	var err error
	filters := filters.NewArgs()
	filters.Add("type", events.ContainerEventType)
	filters.Add("event", "start")
	filters.Add("event", "die")
	filters.Add("scope", "local")
	filters.Add("label", ATTR_PIPELINE_DIR)
	filters.Add("label", ATTR_STAGE_NAME)
	filters.Add("label", ATTR_STEP_NAME)

	//TODO add since flag to filter events since the app started

	cfg := &Config{
		DB:            db,
		Ctx:           ctx,
		Log:           log,
		MonitorErrors: make(chan error),
		LogsPath:      "/data/logs",
		filters:       filters,
	}

	for _, o := range options {
		o(cfg)
	}
	cfg.DockerCli, err = client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return cfg, nil
}

// MonitorAndLog implements Monitor
func (c *Config) MonitorAndLog() {
	log := c.Log
	log.Info("Started to Monitor and log pipeline runs")

	dbConn := c.DB

	msgCh, errCh := c.DockerCli.Events(c.Ctx, types.EventsOptions{
		Filters: c.filters,
	})

	for {
		select {
		case err := <-errCh:
			if err != nil {
				c.MonitorErrors <- err
			}

		case msg := <-msgCh:
			actor := msg.Actor
			go func(actor events.Actor, msg events.Message) {
				log.Debugf("Actor \n%#v\n", actor)
				pipelineDir := actor.Attributes[ATTR_PIPELINE_DIR]
				stageName := actor.Attributes[ATTR_STAGE_NAME]
				stepName := actor.Attributes[ATTR_STEP_NAME]
				var stage = &db.Stage{}
				count, err := dbConn.NewSelect().
					Model(stage).
					Where("name = ? and pipeline_path = ? ", stageName, pipelineDir).
					ScanAndCount(c.Ctx)
				if err != nil {
					log.Errorf("Error monitoring logs %v", err)
					c.MonitorErrors <- err
				}
				if count == 1 {
					log.Debugf("Stage %#v", stage)
					pipelineLogPath := path.Join(c.LogsPath, fmt.Sprintf("%d", stage.ID))
					if err := os.MkdirAll(pipelineLogPath, 0744); err != nil {
						err := fmt.Errorf("unable to create pipeline logs folder %s %w", pipelineLogPath, err)
						log.Error(err)
						c.MonitorErrors <- err
					}
					switch msg.Status {
					case "start":
						log.Debugf("Step Name %s", stepName)
						go c.writeLogs(pipelineLogPath, actor.Attributes)
						c.updateStatuses(stage, stepName, db.Running)
					case "die":
						log.Debugf("Step Name %s", stepName)
						var stepStatus db.Status
						if actor.Attributes["exitCode"] == "0" {
							stepStatus = db.Success
						} else {
							stepStatus = db.Error
						}
						c.updateStatuses(stage, stepName, stepStatus)
					default:
						//no requirement to handle other cases
					}
				} else {
					c.MonitorErrors <- fmt.Errorf("unable to find stage %s ", stageName)
				}
			}(actor, msg)
		}
	}
}

func (c *Config) updateStatuses(stage *db.Stage, stepName string, stepStatus db.Status) {
	dbConn := c.DB
	log := c.Log
	if err := dbConn.RunInTx(c.Ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		log.Infof("Updating Status for stage %#v and steps %s", stage, stepName)

		if err := updateStepStatus(c.Ctx, dbConn, stage, stepStatus, stepName); err != nil {
			return err
		}

		if err := updateStageStatus(c.Ctx, dbConn, stage); err != nil {
			return err
		}

		return nil
	}); err != nil {
		c.MonitorErrors <- err
	}
}

func updateStageStatus(ctx context.Context, dbConn bun.IDB, stage *db.Stage) error {
	log.Infof("Updating Status for stage %#v", stage)
	err := dbConn.NewSelect().
		Model(stage).
		Relation("Steps").
		WherePK().
		Scan(ctx)
	if err != nil {
		return err
	}
	var status db.Status
	for _, step := range stage.Steps {
		status = status | step.Status
	}
	stage.Status = status
	_, err = dbConn.NewUpdate().
		Model(stage).
		WherePK().
		Exec(ctx)
	if err != nil {
		return err
	}

	log.Debugf("Updated Status for stage %#v", stage)

	return nil
}

func updateStepStatus(ctx context.Context, dbConn bun.IDB, stage *db.Stage, status db.Status, stepName string) error {
	var step = &db.StageStep{
		Name: stepName,
	}

	log.Infof("Updating Step %#v for stage %#v", step, stage)

	err := dbConn.NewSelect().
		Model(step).
		Where("stage_id=? and name = ?", stage.ID, stepName).
		Scan(ctx)

	if err != nil {
		return err
	}

	step.Status = status

	_, err = dbConn.NewUpdate().
		Model(step).
		WherePK().
		Exec(ctx)

	if err != nil {
		return err
	}

	log.Debugf("Updating Step %#v for stage %#v", step, stage)

	return nil
}

func (c *Config) writeLogs(pipelineLogPath string, attrs map[string]string) {
	options := types.ContainerLogsOptions{ShowStdout: true, Follow: true}
	c.Log.Debugf("Actor Attributes %#v", attrs)
	out, err := c.DockerCli.ContainerLogs(c.Ctx, attrs["name"], options)
	if err != nil {
		err := fmt.Errorf("error getting logs for container %s, %w ", attrs[ATTR_STEP_NAME], err)
		log.Error(err)
		c.MonitorErrors <- err
	} else {
		containerLogPath := path.Join(pipelineLogPath, fmt.Sprintf("%s.log", md5OfName(attrs[ATTR_STEP_NAME])))
		f, err := os.OpenFile(containerLogPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
		if err != nil {
			err := fmt.Errorf("error writing logs for container %s, %w ", attrs[ATTR_STEP_NAME], err)
			log.Error(err)
			c.MonitorErrors <- err
		} else {
			if _, err := io.Copy(f, out); err != nil {
				err := fmt.Errorf("error copying logs for container %s, %w ", attrs[ATTR_STEP_NAME], err)
				log.Error(err)
				c.MonitorErrors <- err
			}
		}
	}
}

func md5OfName(str string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(str)))
}
