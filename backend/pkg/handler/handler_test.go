package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"sort"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"
	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/utils"
	echo "github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dbfixture"
)

var (
	log *logrus.Logger
	err error
)

func getDBFile(dbName string) string {
	cwd, _ := os.Getwd()
	return path.Join(cwd, "testdata", fmt.Sprintf("%s.db", dbName))
}

func loadFixtures() error {
	log = utils.LogSetup(os.Stdout, "debug")
	dbc := db.New(
		db.WithContext(context.TODO()),
		db.WithLogger(log),
		db.WithDBFile(getDBFile("test")))

	dbc.Init()

	err = dbc.DB.Ping()

	dbfx := dbfixture.New(dbc.DB, dbfixture.WithRecreateTables())
	if err := dbfx.Load(dbc.Ctx, os.DirFS("."), "testdata/fixtures.yaml"); err != nil {
		return err
	}

	return nil
}

func TestGetStages(t *testing.T) {
	if err := loadFixtures(); err != nil {
		t.Fatal(err)
	}

	cwd, _ := os.Getwd()
	b, err := ioutil.ReadFile(path.Join(cwd, "testdata", "want.json"))
	if err != nil {
		t.Fatal(err)
	}

	var want db.Stages
	err = json.Unmarshal(b, &want)
	if err != nil {
		t.Fatal(err)
	}
	sort.Sort(want)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/stages", nil)
	rec := httptest.NewRecorder()
	h := NewHandler(context.Background(), getDBFile("test"), log)
	if c := e.NewContext(req, rec); assert.NoError(t, h.GetStages(c)) {
		assert.Equal(t, http.StatusOK, rec.Code)
		var got db.Stages
		b := rec.Body.Bytes()
		json.Unmarshal(b, &got)
		assert.Equal(t, len(got), 7)
		if err != nil {
			t.Fatal(err)
		}
		//make sure we sort the values
		sort.Sort(got)
		//Verify Stage
		if diff := cmp.Diff(want, got, cmpopts.IgnoreFields(db.Stage{}, "CreatedAt", "ModifiedAt", "Steps", "Logs")); diff != "" {
			t.Errorf("TestGetStages() mismatch (-want +got):\n%s", diff)
		}
	}
}

func TestDeleteStages(t *testing.T) {
	if err := loadFixtures(); err != nil {
		t.Fatal(err)
	}
	deleteTests := map[string]struct {
		requestBody string
		uriPath     string
		dbFile      string
		want        int
	}{
		"multipleIds": {
			requestBody: `[{"ID":2},{"ID":6}]`,
			uriPath:     "/stages",
			dbFile:      "test",
			want:        0,
		},
		"singleId": {
			requestBody: `[{"ID":6}]`,
			uriPath:     "/stages",
			dbFile:      "test",
			want:        0,
		},
	}

	for name, tc := range deleteTests {
		t.Run(name, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(http.MethodDelete, "/", strings.NewReader(tc.requestBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetPath(tc.uriPath)

			ctx := context.Background()
			h := NewHandler(ctx, getDBFile(tc.dbFile), log)

			if assert.NoError(t, h.DeleteStages(c)) {
				assert.Equal(t, http.StatusNoContent, rec.Code)
			}

			var stages db.Stages
			if err := json.Unmarshal([]byte(tc.requestBody), &stages); err != nil {
				t.Fatal(err)
			}
			//Verify
			exists, err := h.dbc.DB.
				NewSelect().
				Model(&stages).
				WherePK().
				Exists(ctx)
			if err != nil {
				t.Fatal(err)
			}

			assert.False(t, exists, "Expecting records to be deleted but it is not")
		})
	}
}

func TestSaveStage(t *testing.T) {
	dbFile := "test_save_stage"
	os.Remove(getDBFile(dbFile))

	log := utils.LogSetup(os.Stdout, "debug")

	saveTests := map[string]struct {
		requestBody string
		uriPath     string
		dbFile      string
		wantSteps   db.Steps
	}{
		"insert": {
			requestBody: `[
				{
				  "id": 5,
				  "stageName": "GoLang Build",
				  "pipelinePath": "/tmp/test-golang-project",
				  "pipelineFile": "/tmp/test-golang-project/.drone.yml",
				  "steps": [
					{
					  "name": "build",
					  "image": "golang",
					  "status": 1
					},
					{
					  "name": "test",
					  "image": "golang",
					  "status": 1
					}
				  ],
				  "logs": "",
				  "status": 1
				}
			  ]`,
			uriPath: "/stages",
			dbFile:  dbFile,
			wantSteps: []*db.StageStep{
				{
					ID:      1,
					Name:    "build",
					Image:   "golang",
					Status:  db.Success,
					StageID: 5,
				}, {
					ID:      2,
					Name:    "test",
					Image:   "golang",
					Status:  db.Success,
					StageID: 5,
				},
			},
		},
		"upsert": {
			requestBody: `[
				{
				  "id": 5,
				  "stageName": "GoLang Build",
				  "pipelinePath": "/tmp/test-golang-project",
				  "pipelineFile": "/tmp/test-golang-project/.drone.yml",
				  "steps": [
					{
					  "name": "build",
					  "image": "golang",
					  "status": 1
					},
					{
					  "name": "test",
					  "image": "golang",
					  "status": 1
					},
					{
						"name": "package",
						"image": "plugins/docker",
						"status": 1
					  }
				  ],
				  "logs": "",
				  "status": 1
				}
			  ]`,
			uriPath: "/stages",
			dbFile:  dbFile,
			wantSteps: []*db.StageStep{
				{
					ID:      1,
					Name:    "build",
					Image:   "golang",
					Status:  db.Success,
					StageID: 5,
				},
				{
					ID:      2,
					Name:    "test",
					Image:   "golang",
					Status:  db.Success,
					StageID: 5,
				},
				{
					ID:      3,
					Name:    "package",
					Image:   "plugins/docker",
					Status:  db.Success,
					StageID: 5,
				},
			},
		},
	}

	for name, tc := range saveTests {
		t.Run(name, func(t *testing.T) {
			e := echo.New()
			var want, got db.Stages
			err := json.Unmarshal([]byte(tc.requestBody), &want)
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPost, tc.uriPath, strings.NewReader(tc.requestBody))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			ctx := context.TODO()
			h := NewHandler(ctx, getDBFile(dbFile), log)
			if c := e.NewContext(req, rec); assert.NoError(t, h.SaveStages(c)) {
				assert.Equal(t, http.StatusCreated, rec.Code)
				dbConn := h.dbc.DB
				err := dbConn.NewSelect().
					Model(&got).
					Relation("Steps").
					Scan(ctx)
				if err != nil {
					t.Fatal(err)
				}
				assert.True(t, want.Len() == got.Len(), "Expecting at least one record with stage with id 5 but got none")

				//Verify Stage
				if diff := cmp.Diff(want, got, cmpopts.IgnoreFields(db.Stage{}, "CreatedAt", "ModifiedAt", "Steps", "Logs")); diff != "" {
					t.Errorf("MakeGatewayInfo() mismatch (-want +got):\n%s", diff)
				}

				aStage := got[0]
				//Verify Steps
				assert.Truef(t, aStage.Steps.Len() == tc.wantSteps.Len(), "Expecting stage to have %d steps but got %d", tc.wantSteps.Len(), aStage.Steps.Len())
				if diff := cmp.Diff(tc.wantSteps, aStage.Steps, cmpopts.IgnoreFields(db.StageStep{}, "CreatedAt", "ModifiedAt")); diff != "" {
					t.Errorf("TestSaveStage() mismatch (-want +got):\n%s", diff)
				}
			}
		})
	}

	os.Remove(getDBFile(dbFile))
}

func TestUpdateStageStatus(t *testing.T) {
	if err := loadFixtures(); err != nil {
		t.Fatal(err)
	}
	statusTests := map[string]struct {
		stageID int
		uriPath string
		dbFile  string
		want    db.Status
	}{
		"success": {
			stageID: 5,
			uriPath: "/stage/:id/:status",
			dbFile:  "test",
			want:    db.Success,
		},
		"failed": {
			stageID: 4,
			uriPath: "/stage/:id/:status",
			dbFile:  "test",
			want:    db.Failed,
		},
		"default": {
			stageID: 7,
			uriPath: "/stage/:id/:status",
			dbFile:  "test",
			want:    db.None,
		},
	}

	for name, tc := range statusTests {
		t.Run(name, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(http.MethodPatch, tc.uriPath, nil)
			rec := httptest.NewRecorder()
			ctx := context.TODO()
			h := NewHandler(ctx, getDBFile(tc.dbFile), log)
			c := e.NewContext(req, rec)
			c.SetPath(tc.uriPath)
			c.SetParamNames("id", "status")
			c.SetParamValues(fmt.Sprintf("%d", tc.stageID), fmt.Sprintf("%d", tc.want))
			if assert.NoError(t, h.UpdateStageStatus(c)) {
				assert.Equal(t, http.StatusNoContent, rec.Code)
				dbConn := h.dbc.DB
				stage := &db.Stage{ID: tc.stageID}
				err := dbConn.NewSelect().
					Model(stage).
					WherePK().
					Scan(ctx)
				if err != nil {
					t.Fatal(err)
				}
				got := stage.Status
				assert.Equalf(t, tc.want, got, `Expecting status to be "%s" but got "%s"`, tc.want, got)
			}
		})
	}
}

func TestUpdateStepStatus(t *testing.T) {
	if err := loadFixtures(); err != nil {
		t.Fatal(err)
	}
	statusTests := map[string]struct {
		stepID  int
		uriPath string
		dbFile  string
		want    db.Status
	}{
		"success": {
			stepID:  5,
			uriPath: "/step/:id/:status",
			dbFile:  "test",
			want:    db.Success,
		},
		"failed": {
			stepID:  4,
			uriPath: "/step/:id/:status",
			dbFile:  "test",
			want:    db.Failed,
		},
		"default": {
			stepID:  7,
			uriPath: "/step/:id/:status",
			dbFile:  "test",
			want:    db.None,
		},
	}

	for name, tc := range statusTests {
		t.Run(name, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(http.MethodPatch, tc.uriPath, nil)
			rec := httptest.NewRecorder()
			ctx := context.TODO()
			h := NewHandler(ctx, getDBFile(tc.dbFile), log)
			c := e.NewContext(req, rec)
			c.SetPath(tc.uriPath)
			c.SetParamNames("id", "status")
			c.SetParamValues(fmt.Sprintf("%d", tc.stepID), fmt.Sprintf("%d", tc.want))
			if assert.NoError(t, h.UpdateStageStatus(c)) {
				assert.Equal(t, http.StatusNoContent, rec.Code)
				dbConn := h.dbc.DB
				step := &db.Stage{ID: tc.stepID}
				err := dbConn.NewSelect().
					Model(step).
					WherePK().
					Scan(ctx)
				if err != nil {
					t.Fatal(err)
				}
				got := step.Status
				assert.Equalf(t, tc.want, got, `Expecting status to be "%s" but got "%s"`, tc.want, got)
			}
		})
	}
}
