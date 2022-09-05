package handler

import (
	"context"
	"net/http"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"
	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

func NewHandler(ctx context.Context, dbFile string, log *logrus.Logger) *Handler {
	dbc := db.New(ctx, log, dbFile)
	dbc.Init()

	return &Handler{
		dbc: dbc,
	}
}

func (h *Handler) GetPipelines(c echo.Context) error {
	log := h.dbc.Log
	log.Info("Get Pipelines")
	records := make([]*db.Stage, 0)
	db := h.dbc.DB

	err := db.NewSelect().
		Model(&records).
		Relation("Steps").
		Scan(h.dbc.Ctx)

	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, records)
	return nil
}

// func (h *Handler) DeletePipelines(c echo.Context) error {
// 	log := h.dbc.Log
// 	var pipelineIds []*string
// 	if err := c.Bind(&pipelineIds); err != nil {
// 		return err
// 	}
// 	log.Infof("DeletePipelines %v", pipelineIds)
// 	for _, id := range pipelineIds {
// 		if err := h.delete(*id); err != nil {
// 			return err
// 		}
// 	}
// 	return c.JSON(http.StatusOK, pipelineIds)
// }

// func (h *Handler) DeletePipeline(c echo.Context) error {
// 	log := h.dbc.Log
// 	var id string
// 	if err := echo.PathParamsBinder(c).
// 		String("id", &id).
// 		BindError(); err != nil {
// 		return err
// 	}

// 	log.Infof("DeletePipeline %s", id)
// 	if err := h.delete(id); err == nil {
// 		return c.NoContent(http.StatusNoContent)
// 	}

// 	return echo.NewHTTPError(http.StatusNotFound, "pipeline not found")
// }

// func (h *Handler) SavePipelines(c echo.Context) error {
// 	log := h.dbc.Log
// 	var dps []*DronePipeline
// 	if err := c.Bind(&dps); err != nil {
// 		return err
// 	}
// 	log.Infof("Save Pipelines %v", dps)
// 	for _, dp := range dps {
// 		//Update existing
// 		if h.hasElement(dp.ID) {
// 			log.Infof("Updating existing pipeline %s ", dp.PipelineFile)
// 			if idx := h.indexOf(dp.ID); idx != 1 {
// 				h.db[idx] = dp
// 			}
// 		} else { //Add new
// 			log.Infof("Adding new pipeline %s ", dp.PipelineFile)
// 			h.db = append(h.db, dp)
// 		}
// 	}
// 	h.persistDB()
// 	return c.JSON(http.StatusCreated, dps)
// }

// func (h *Handler) indexOf(id string) int {
// 	for i, e := range h.db {
// 		if e.ID == id {
// 			return i
// 		}
// 	}
// 	return -1
// }

// func (h *Handler) hasElement(id string) bool {
// 	for _, e := range h.db {
// 		if e.ID == id {
// 			return true
// 		}
// 	}
// 	return false
// }

// func (h *Handler) persistDB() error {
// 	b, err := json.Marshal(h.db)
// 	if err != nil {
// 		return err
// 	}
// 	if err := ioutil.WriteFile(h.dbFile, b, 0644); err != nil {
// 		return err
// 	}
// 	return nil
// }

// func (h *Handler) delete(id string) error {
// 	if ok := h.hasElement(id); ok {
// 		i := h.indexOf(id)
// 		if i != -1 {
// 			h.db = append(h.db[:i], h.db[i+1:]...)
// 			if err := h.persistDB(); err != nil {
// 				return err
// 			}
// 		}
// 	}
// 	return nil
// }
