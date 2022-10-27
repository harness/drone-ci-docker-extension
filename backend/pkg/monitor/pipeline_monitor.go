package monitor

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/harness/drone-ci-docker-extension/pkg/db"
	"github.com/harness/drone-ci-docker-extension/pkg/utils"
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
	filters.Add("label", LabelPipelineFile)
	filters.Add("label", LabelStageName)
	filters.Add("label", LabelStepName)

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
			log.Tracef("Message \n%#v\n", msg)
			go func(actor events.Actor, msg events.Message) {
				log.Tracef("Actor \n%#v\n", actor)
				pipelineFile := actor.Attributes[LabelPipelineFile]
				var includes, excludes []string
				if v, ok := actor.Attributes[LabelIncludes]; ok {
					if v != "" {
						includes = strings.Split(v, ",")
					}
				}
				if v, ok := actor.Attributes[LabelExcludes]; ok {
					if v != "" {
						excludes = strings.Split(v, ",")
					}
				}
				stageName := actor.Attributes[LabelStageName]
				stepName := actor.Attributes[LabelStepName]
				var stage = &db.Stage{}
				count, err := dbConn.NewSelect().
					Model(stage).
					Relation("Steps").
					Where("name = ? and pipeline_file = ? ", stageName, pipelineFile).
					ScanAndCount(c.Ctx)

				if err != nil {
					log.Errorf("Error monitoring logs %v", err)
					c.MonitorErrors <- err
				}
				log.Debugf("Includes %v", includes)
				log.Debugf("Excludes %v", excludes)
				if len(includes) > 0 {
					i, e := FilterSteps(stage.Steps, includes)
					updateStepStatus(c.Ctx, dbConn, e)
					stage.Steps = i
				}
				if len(excludes) > 0 {
					i, e := FilterSteps(stage.Steps, excludes)
					updateStepStatus(c.Ctx, dbConn, e)
					stage.Steps = i
				}
				if count == 1 {
					log.Tracef("Stage %#v", stage)
					pipelineLogPath := path.Join(c.LogsPath, fmt.Sprintf("%d", stage.ID))
					if err := os.MkdirAll(pipelineLogPath, 0744); err != nil {
						err := fmt.Errorf("unable to create pipeline logs folder %s %w", pipelineLogPath, err)
						log.Error(err)
						c.MonitorErrors <- err
					}
					switch msg.Status {
					case "start":
						go c.writeLogs(pipelineLogPath, actor.Attributes)
						log.Infof("Starting Step Name %s", stepName)
						//Resetting the status of the steps
						//All steps from the current step identified by stepName
						//are set to status == db.None
						stepIdx := getRunningStepIndex(stage, stepName)
						//currently running step will have running status
						stage.Steps[stepIdx].Status = db.Running
						for i := stepIdx + 1; i < len(stage.Steps); i++ {
							if stage.Steps[i].Service != 1 {
								stage.Steps[i].Status = db.None
							}
						}
						//update the stage to be running if current step is the first step
						c.updateStatuses(stage, stepIdx == 0)
					case "die":
						_, isService := actor.Attributes[LabelService]
						log.Tracef("Dying Step Name %s, attributes %#v", stepName, actor.Attributes)
						stepIdx := getRunningStepIndex(stage, stepName)
						var stepStatus db.Status
						exitCode := actor.Attributes["exitCode"]
						log.Infof("Dying Step Name %s, Exit Code %s", stepName, exitCode)
						//handle Exit code 137 to be success only for services
						if exitCode == "0" || (isService && exitCode == "137") {
							stepStatus = db.Success
						} else {
							stepStatus = db.Error
						}
						stage.Steps[stepIdx].Status = stepStatus
						//update the overall stage status only if the current step is last step or any error occurred
						c.updateStatuses(stage, stepIdx == len(stage.Steps)-1 || stepStatus == db.Error)
					default:
						//no requirement to handle other cases
					}
				} else {
					c.MonitorErrors <- fmt.Errorf("unable to find stage %s in pipeline %s", stageName, pipelineFile)
				}
			}(actor, msg)
		}
	}
}

// FilterSteps Filters the Steps based on included/excluded step names.
// Returns included and excluded steps
func FilterSteps(steps []*db.StageStep, filters []string) (i db.Steps, e db.Steps) {
	m := make(map[string]bool)
	for _, item := range filters {
		m[item] = true
	}

	for _, step := range steps {
		if _, ok := m[step.Name]; ok {
			i = append(i, step)
		} else {
			//Erase old statuses if any
			step.Status = db.None
			e = append(e, step)
		}
	}
	return
}

func getRunningStepIndex(stage *db.Stage, stepName string) int {
	var stepIdx int
	for i, st := range stage.Steps {
		if st.Name == stepName {
			stepIdx = i
			break
		}
	}
	return stepIdx
}

func (c *Config) updateStatuses(stage *db.Stage, updateStage bool) {
	dbConn := c.DB
	log := c.Log
	if err := dbConn.RunInTx(c.Ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		log.Infof("Updating Statuses for stage %s of pipeline %s", stage.Name, stage.PipelineFile)

		if err := updateStepStatus(c.Ctx, dbConn, stage.Steps); err != nil {
			return err
		}

		if updateStage {
			if err := updateStageStatus(c.Ctx, dbConn, stage); err != nil {
				return err
			}
		}
		return utils.TriggerUIRefresh(c.Ctx, c.DockerCli, c.Log)
	}); err != nil {
		c.MonitorErrors <- err
	}
}

func updateStageStatus(ctx context.Context, dbConn bun.IDB, stage *db.Stage) error {
	var status db.Status
	for _, step := range stage.Steps {
		if step.Status > status {
			status = step.Status
		}
	}
	stage.Status = status
	_, err := dbConn.NewUpdate().
		Model(stage).
		WherePK().
		Exec(ctx)
	if err != nil {
		return err
	}

	log.Infof("Updated Status for stage %s with status %s", stage.Name, stage.Status)

	return nil
}

func updateStepStatus(ctx context.Context, dbConn bun.IDB, steps db.Steps) error {
	values := dbConn.NewValues(&steps)

	_, err := dbConn.NewUpdate().
		With("_data", values).
		Model((*db.StageStep)(nil)).
		Table("_data").
		Set("status = _data.status").
		Where("st.id = _data.id").
		Exec(ctx)

	if err != nil {
		return err
	}

	for _, step := range steps {
		log.Infof("Updated Step %s with status %s", step.Name, step.Status)
	}

	return nil
}

func (c *Config) writeLogs(pipelineLogPath string, attrs map[string]string) {
	options := types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true, Follow: true, Tail: "true"}
	c.Log.Tracef("Actor Attributes %#v", attrs)
	out, err := c.DockerCli.ContainerLogs(c.Ctx, attrs["name"], options)
	if err != nil {
		err := fmt.Errorf("error getting logs for container %s, %w ", attrs[LabelStepName], err)
		log.Error(err)
		c.MonitorErrors <- err
	} else {
		containerLogPath := path.Join(pipelineLogPath, fmt.Sprintf("%s.log", utils.Md5OfString(attrs[LabelStepName])))
		f, err := os.OpenFile(containerLogPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
		if err != nil {
			err := fmt.Errorf("error writing logs for container %s, %w ", attrs[LabelStepName], err)
			log.Error(err)
			c.MonitorErrors <- err
		} else {
			if _, err := io.Copy(f, out); err != nil {
				err := fmt.Errorf("error copying logs for container %s, %w ", attrs[LabelStepName], err)
				log.Error(err)
				c.MonitorErrors <- err
			}
		}
	}
}
