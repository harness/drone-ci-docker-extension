package handler

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"os"

	echo "github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
)

type (
	Handler struct {
		dbFile string
		db     []*DronePipeline
	}

	//PipelineStep represents a pipeline step
	PipelineStep struct {
		StepName  string `json:"name"`
		StepImage string `json:"image"`
		Status    string `json:"status"`
	}

	//PipelineStatus of the Pipeline
	PipelineStatus struct {
		Total int `json:"total"`
		Error int `json:"error"`
		Done  int `json:"done"`
	}

	//DronePipeline is the request data to save the Pipeline
	DronePipeline struct {
		ID           string         `json:"id"`
		StageName    string         `json:"stageName"`
		Path         string         `json:"pipelinePath"`
		PipelineFile string         `json:"pipelineFile"`
		Steps        []PipelineStep `json:"steps,omitempty"`
		Status       PipelineStatus `json:"status"`
	}
)

func NewHandler(dbFilePath string) (*Handler, error) {
	var err error
	var db []*DronePipeline
	if dbFilePath != "" {
		_, err = os.Stat(dbFilePath)
		if err != nil && !errors.Is(err, os.ErrNotExist) {
			return nil, err
		}
	}

	if err == nil && dbFilePath != "" {
		db, err = loadDB(dbFilePath)
	}

	if err != nil {
		return nil, err
	}

	return &Handler{
		dbFile: dbFilePath,
		db:     db,
	}, nil
}

func loadDB(dbFilePath string) ([]*DronePipeline, error) {
	var db []*DronePipeline
	b, err := ioutil.ReadFile(dbFilePath)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(b, &db)

	if err != nil {
		return nil, err
	}

	return db, nil
}

func (h *Handler) GetPipelines(c echo.Context) error {
	log.Info("GetPipelines")
	var db []DronePipeline

	_, err := os.Stat(h.dbFile)
	if err != nil {
		return err
	}

	b, err := ioutil.ReadFile(h.dbFile)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(b, &db); err != nil {
		return err
	}
	c.JSON(http.StatusOK, db)
	return nil
}

func (h *Handler) DeletePipelines(c echo.Context) error {
	var pipelineIds []*string
	if err := c.Bind(&pipelineIds); err != nil {
		return err
	}
	log.Infof("DeletePipelines %v", pipelineIds)
	for _, id := range pipelineIds {
		if err := h.delete(*id); err != nil {
			return err
		}
	}
	return c.JSON(http.StatusOK, pipelineIds)
}

func (h *Handler) DeletePipeline(c echo.Context) error {
	var id string
	if err := echo.PathParamsBinder(c).
		String("id", &id).
		BindError(); err != nil {
		return err
	}

	log.Infof("DeletePipeline %s", id)
	if err := h.delete(id); err == nil {
		return c.NoContent(http.StatusNoContent)
	}

	return echo.NewHTTPError(http.StatusNotFound, "pipeline not found")
}

func (h *Handler) SavePipelines(c echo.Context) error {
	var dps []*DronePipeline
	if err := c.Bind(&dps); err != nil {
		return err
	}
	log.Infof("Save Pipelines %v", dps)
	for _, dp := range dps {
		//Update existing
		if h.hasElement(dp.ID) {
			log.Infof("Updating existing pipeline %s ", dp.PipelineFile)
			if idx := h.indexOf(dp.ID); idx != 1 {
				h.db[idx] = dp
			}
		} else { //Add new
			log.Infof("Adding new pipeline %s ", dp.PipelineFile)
			h.db = append(h.db, dp)
		}
	}
	h.persistDB()
	return c.JSON(http.StatusCreated, dps)
}

func (h *Handler) indexOf(id string) int {
	for i, e := range h.db {
		if e.ID == id {
			return i
		}
	}
	return -1
}

func (h *Handler) hasElement(id string) bool {
	for _, e := range h.db {
		if e.ID == id {
			return true
		}
	}
	return false
}

func (h *Handler) persistDB() error {
	b, err := json.Marshal(h.db)
	if err != nil {
		return err
	}
	if err := ioutil.WriteFile(h.dbFile, b, 0644); err != nil {
		return err
	}
	return nil
}

func (h *Handler) delete(id string) error {
	if ok := h.hasElement(id); ok {
		i := h.indexOf(id)
		if i != -1 {
			h.db = append(h.db[:i], h.db[i+1:]...)
			if err := h.persistDB(); err != nil {
				return err
			}
		}
	}
	return nil
}
