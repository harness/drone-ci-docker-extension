package db

import (
	"context"
	"os"
	"testing"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/utils"
	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dbfixture"
)

func TestInitDB(t *testing.T) {
	log, err := utils.LogSetup(os.Stdout, "debug")
	if err != nil {
		t.Fatal(err)
	}

	dbc := &Config{
		ctx:    context.TODO(),
		log:    log,
		dbFile: "testdata/test.db",
	}
	dbc.Init()

	err = dbc.db.Ping()
	assert.Nil(t, err)

	dbfx := dbfixture.New(dbc.db, dbfixture.WithRecreateTables())
	if err := dbfx.Load(dbc.ctx, os.DirFS("."), "testdata/fixtures.yaml"); err != nil {
		t.Fatal(err)
	}

	expected := dbfx.MustRow("Pipeline.helloWorld").(*Pipeline)
	assert.NotNil(t, expected)
	actual := &Pipeline{ID: "8765a81db28a4507f7cd35b8e216a6db"}
	err = dbc.db.NewSelect().Model(actual).WherePK().Scan(dbc.ctx)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, expected.ID, actual.ID, "Expected ID %s but got", expected.ID, actual.ID)
	assert.Equal(t, expected.PipelinePath, actual.PipelinePath, "Expected Pipeline Path %s but got", expected.PipelinePath, actual.PipelinePath)
	assert.Equal(t, expected.PipelineFile, actual.PipelineFile, "Expected Pipeline file %s but got", expected.PipelineFile, actual.PipelineFile)
	assert.Equal(t, actual.CreatedAt.UTC(), expected.CreatedAt.UTC(), "Actual Created At %s and Expected Created At %s", actual.CreatedAt.UTC(), expected.CreatedAt.UTC())
	os.Remove("testdata/test.db")
}
