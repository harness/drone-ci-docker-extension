package handler

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"path"
	"reflect"
	"strings"
	"testing"

	echo "github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func getDataFile(filePath string) string {
	cwd, _ := os.Getwd()
	return path.Join(cwd, "testdata", filePath)
}

func prepareDataFile() error {
	dataFileSource := getDataFile("db.data.json")
	b, err := ioutil.ReadFile(dataFileSource)
	if err != nil {
		return err
	}

	dataFile := getDataFile("db.json")
	if err := ioutil.WriteFile(dataFile, b, 0644); err != nil {
		return err
	}

	return nil
}

func TestGetPipelines(t *testing.T) {
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}

	expected := []*DronePipeline{
		{
			ID:           "2766b8e028dfd7ee1fea1b2b74355a90",
			StageName:    "GoLang Build",
			Path:         "/tmp/test-golang-project",
			PipelineFile: "/tmp/test-golang-project/.drone.yml",
			Steps: []PipelineStep{
				{StepName: "step-one", StepImage: "busybox", Status: "done"},
				{StepName: "step-two", StepImage: "alpine", Status: "error"},
			},
			Status: PipelineStatus{
				Total: 2,
				Error: 1,
				Done:  1,
			},
		},
		{
			ID:           "563f1cdfe5970775b835d97d75ef6397",
			StageName:    "Java Build",
			Path:         "/tmp/test-java-project",
			PipelineFile: "/tmp/test-java-project/.drone.yml",
			Steps: []PipelineStep{
				{StepName: "step-one", StepImage: "busybox", Status: "done"},
				{StepName: "step-two", StepImage: "alpine", Status: "done"},
			},
			Status: PipelineStatus{
				Total: 2,
				Error: 0,
				Done:  2,
			},
		},
		{
			ID:           "f6d03b00771697d8b78e816104c38bae",
			StageName:    "Node Build",
			Path:         "/tmp/test-nodejs-project",
			PipelineFile: "/tmp/test-nodejs-project/.drone.yml",
			Steps: []PipelineStep{
				{StepName: "step-one", StepImage: "busybox", Status: "done"},
			},
			Status: PipelineStatus{
				Total: 1,
				Error: 0,
				Done:  1,
			},
		},
	}
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/pipelines", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	dataFile := getDataFile("db.json")
	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}
	if assert.NoError(t, h.GetPipelines(c)) {
		assert.Equal(t, http.StatusOK, rec.Code)
		var actual []*DronePipeline
		json.Unmarshal(rec.Body.Bytes(), &actual)
		assert.Equal(t, len(actual), 3)
		assert.True(t, reflect.DeepEqual(expected, actual))
	}
	os.Remove(dataFile)
}

func TestDeletePipelines(t *testing.T) {
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}

	pipelineIdsJSON := `["563f1cdfe5970775b835d97d75ef6397","f6d03b00771697d8b78e816104c38bae"]`
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(pipelineIdsJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/pipelines/delete")

	dataFile := getDataFile("db.json")

	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}

	if assert.NoError(t, h.DeletePipelines(c)) {
		assert.Equal(t, http.StatusOK, rec.Code)
		var ids []string
		json.Unmarshal(rec.Body.Bytes(), &ids)
		assert.NotNil(t, ids)
		assert.Equal(t, len(ids), 2)
		assert.True(t, reflect.DeepEqual(ids, []string{"563f1cdfe5970775b835d97d75ef6397", "f6d03b00771697d8b78e816104c38bae"}))
	}
	os.Remove(dataFile)
}

func TestDeletePipeline(t *testing.T) {
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/pipeline/:id")
	c.SetParamNames("id")
	c.SetParamValues("f6d03b00771697d8b78e816104c38bae")
	dataFile := getDataFile("db.json")

	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}

	if assert.NoError(t, h.DeletePipeline(c)) {
		assert.Equal(t, http.StatusNoContent, rec.Code)
		dp := DronePipeline{}
		b, err := ioutil.ReadFile(dataFile)

		if err != nil {
			t.Fatal(err)
		}
		json.Unmarshal(b, &dp)
		assert.NotNil(t, dp)
		ok := h.hasElement("f6d03b00771697d8b78e816104c38bae")
		assert.False(t, ok)
	}
	os.Remove(dataFile)
}

func TestSavePipeline(t *testing.T) {
	dataFile := getDataFile("db.json")
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	newPipelineJSON := `[
		{
		"id": "2766b8e028dfd7ee1fea1b2b74355a90",
		"stageName":"GoLang Build", 
		"pipelinePath":"/tmp/test-golang-project",
		"pipelineFile": "/tmp/test-golang-project/.drone.yml"
		}
	]`
	req := httptest.NewRequest(http.MethodPost, "/pipeline", strings.NewReader(newPipelineJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}

	if assert.NoError(t, h.SavePipelines(c)) {
		assert.Equal(t, http.StatusCreated, rec.Code)
		var dps []*DronePipeline
		json.Unmarshal(rec.Body.Bytes(), &dps)
		assert.NotNil(t, dps)
		assert.Equal(t, len(dps), 1)
		assert.True(t, reflect.DeepEqual(dps, []*DronePipeline{
			{ID: "2766b8e028dfd7ee1fea1b2b74355a90", StageName: "GoLang Build", Path: "/tmp/test-golang-project", PipelineFile: "/tmp/test-golang-project/.drone.yml"},
		}))
	}
	os.Remove(dataFile)
}

func TestUpdatePipeline(t *testing.T) {
	dataFile := getDataFile("db.json")
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	newPipelineJSON := `[
		{
			"id": "2766b8e028dfd7ee1fea1b2b74355a90",
			"stageName": "GoLang Build",
			"pipelinePath": "/tmp/test-golang-project",
			"pipelineFile": "/tmp/test-golang-project/.drone.yml",
			"steps": [
			  {
				"name": "step-one",
				"image": "busybox",
				"status": "done"
			  },
			  {
				"name": "step-two",
				"image": "alpine",
				"status": "error"
			  }
			],
			"status": {
				"total": 2,
				"error": 1,
				"done": 1
			}
		  }
	]`
	req := httptest.NewRequest(http.MethodPost, "/pipeline", strings.NewReader(newPipelineJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}

	if assert.NoError(t, h.SavePipelines(c)) {
		assert.Equal(t, http.StatusCreated, rec.Code)
		var dps []*DronePipeline
		json.Unmarshal(rec.Body.Bytes(), &dps)
		assert.NotNil(t, dps)
		assert.Equal(t, len(dps), 1)

		dp := dps[0]
		assert.Equal(t, "2766b8e028dfd7ee1fea1b2b74355a90", dp.ID)
		assert.Equal(t, "GoLang Build", dp.StageName)
		assert.Equal(t, "/tmp/test-golang-project", dp.Path)
		assert.Equal(t, "/tmp/test-golang-project/.drone.yml", dp.PipelineFile)
		assert.NotNil(t, dp.Status)
		assert.Equal(t, 2, len(dp.Steps))
		assert.Equal(t, 2, dp.Status.Total)
		assert.Equal(t, 1, dp.Status.Done)
		assert.Equal(t, 1, dp.Status.Error)
	}
	os.Remove(dataFile)
}

func TestSavePipelines(t *testing.T) {
	dataFile := getDataFile("db.json")
	if err := prepareDataFile(); err != nil {
		t.Fatal(err)
	}
	e := echo.New()
	expected := []*DronePipeline{
		{ID: "2766b8e028dfd7ee1fea1b2b74355a90", StageName: "GoLang Build", Path: "/tmp/test-golang-project", PipelineFile: "/tmp/test-golang-project/.drone.yml", Steps: []PipelineStep{}, Status: PipelineStatus{}},
		{ID: "563f1cdfe5970775b835d97d75ef6397", StageName: "Java Build", Path: "/tmp/test-java-project", PipelineFile: "/tmp/test-java-project/.drone.yml", Steps: []PipelineStep{}, Status: PipelineStatus{}},
	}
	newPipelinesJSON := `[
	{
	"id": "2766b8e028dfd7ee1fea1b2b74355a90",
	"stageName":"GoLang Build", 
	"pipelinePath":"/tmp/test-golang-project",
	"pipelineFile": "/tmp/test-golang-project/.drone.yml"
	},
	{
	"id":"563f1cdfe5970775b835d97d75ef6397",
	"stageName":"Java Build", 
	"pipelinePath":"/tmp/test-java-project",
	"pipelineFile":"/tmp/test-java-project/.drone.yml"}
	]`
	req := httptest.NewRequest(http.MethodPost, "/pipeline", strings.NewReader(newPipelinesJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	h, err := NewHandler(dataFile)
	if err != nil {
		t.Fatal(err)
	}
	if assert.NoError(t, h.SavePipelines(c)) {
		assert.Equal(t, http.StatusCreated, rec.Code)
		var actual []*DronePipeline
		json.Unmarshal(rec.Body.Bytes(), &actual)
		assert.NotNil(t, actual)
		assert.Equal(t, len(actual), 2)
		assert.True(t, reflect.DeepEqual(actual, expected))
	}
	os.Remove(dataFile)
}
