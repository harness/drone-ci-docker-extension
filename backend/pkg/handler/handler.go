package handler

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"
	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

func NewHandler(ctx context.Context, dbFile string, log *logrus.Logger) *Handler {
	dbc := db.New(ctx, log, dbFile)
	dbc.Init()

	return &Handler{
		dbc: dbc,
	}
}

func (h *Handler) GetStages(c echo.Context) error {
	log := h.dbc.Log
	log.Info("Get Pipelines")
	stages := make(db.Stages, 0)
	db := h.dbc.DB

	err := db.NewSelect().
		Model(&stages).
		Relation("Steps").
		Order("pipeline_file ASC").
		Scan(h.dbc.Ctx)

	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, stages)
}

func (h *Handler) DeleteStages(c echo.Context) error {
	log := h.dbc.Log
	var stages []*db.Stage
	if err := c.Bind(&stages); err != nil {
		return err
	}

	log.Infof("Delete Stages %v", stages)

	if err := h.delete(stages); err != nil {
		return err
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) delete(stages []*db.Stage) error {
	ctx := h.dbc.Ctx
	dbConn := h.dbc.DB
	return dbConn.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		_, err := dbConn.NewDelete().
			Model(&stages).
			WherePK().
			Exec(ctx)
		if err != nil {
			return err
		}
		return nil
	})
}

func (h *Handler) SaveStages(c echo.Context) error {
	log := h.dbc.Log
	ctx := h.dbc.Ctx
	var stages []*db.Stage
	if err := c.Bind(&stages); err != nil {
		return err
	}
	log.Infof("Saving stages %v", stages)

	dbConn := h.dbc.DB
	if err := dbConn.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		_, err := dbConn.NewInsert().
			Model(&stages).
			On("CONFLICT(name,pipeline_file) DO UPDATE").
			Set("name = excluded.name").
			Set("pipeline_file = excluded.pipeline_file").
			Set("pipeline_path = excluded.pipeline_path").
			Set("status = excluded.status").
			Exec(ctx)
		if err != nil {
			return err
		}
		//Insert or update steps
		for _, stage := range stages {
			steps := stage.Steps
			for _, s := range steps {
				s.StageID = stage.ID
			}
			_, err = dbConn.NewInsert().
				Model(&steps).
				On("CONFLICT(name,stage_id) DO UPDATE").
				Set("name = excluded.name").
				Set("status = excluded.status").
				Set("image = excluded.image").
				Exec(ctx)
			if err != nil {
				return err
			}
		}
		return err
	}); err != nil {
		return err
	}

	return c.JSON(http.StatusCreated, stages)
}

func (h *Handler) StageLogs(c echo.Context) error {
	log := h.dbc.Log
	var stageID int
	if err := echo.PathParamsBinder(c).
		Int("id", &stageID).
		BindError(); err != nil {
		return err
	}
	log.Infof("Getting logs for Stage %d", stageID)

	return nil
}

func (h *Handler) UpdateStageStatus(c echo.Context) error {
	log := h.dbc.Log
	ctx := h.dbc.Ctx
	dbConn := h.dbc.DB
	var stageID, status int
	if err := echo.PathParamsBinder(c).
		Int("id", &stageID).
		Int("status", &status).
		BindError(); err != nil {
		return err
	}

	log.Infof("Updating Stage %d with status %d", stageID, status)

	if err := dbConn.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		stage := &db.Stage{
			ID:     stageID,
			Status: db.Status(status),
		}
		_, err := dbConn.NewUpdate().
			Model(stage).
			Column("status").
			WherePK().
			Exec(ctx)
		return err
	}); err != nil {
		return err
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) UpdateStepStatus(c echo.Context) error {
	log := h.dbc.Log
	ctx := h.dbc.Ctx
	dbConn := h.dbc.DB
	var stepID, status int
	if err := echo.PathParamsBinder(c).
		Int("stepId", &stepID).
		Int("status", &status).
		BindError(); err != nil {
		return err
	}

	log.Infof("Updating Step %d with status %d", stepID, status)

	if err := dbConn.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		stageStep := &db.StageStep{
			ID:     stepID,
			Status: db.Status(status),
		}
		_, err := dbConn.NewUpdate().
			Model(stageStep).
			Column("status").
			WherePK().
			Exec(ctx)
		return err
	}); err != nil {
		return err
	}

	return c.NoContent(http.StatusNoContent)
}

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
