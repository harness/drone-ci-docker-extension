package db

import (
	"context"
	"os"
	"testing"

	"github.com/kameshsampath/drone-desktop-docker-extension/pkg/utils"
	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dbfixture"
)

func TestInitDB(t *testing.T) {
	var (
		dbc  = new(Config)
		dbfx *dbfixture.Fixture
	)
	log, err := utils.LogSetup(os.Stdout, "debug")
	if err != nil {
		t.Fatal(err)
	}
	dbc = &Config{
		Ctx:    context.TODO(),
		Log:    log,
		DBFile: "testdata/test.db",
	}
	dbc.Init()

	err = dbc.DB.Ping()

	if err != nil {
		t.Fatal(err)
	}

	dbfx = dbfixture.New(dbc.DB, dbfixture.WithRecreateTables())
	if err := dbfx.Load(dbc.Ctx, os.DirFS("."), "testdata/fixtures.yaml"); err != nil {
		t.Fatal(err)
	}

	expected := dbfx.MustRow("Stage.hwDefault").(*Stage)
	assert.NotNil(t, expected)

	sts := dbfx.MustRow("StageStep.pk1").(*StageStep)
	assert.NotNil(t, sts)
	assert.Equal(t, 1, sts.StageID)

	actual := &Stage{
		PipelineFile: "/tmp/examples/hello-world/.drone.yml",
	}

	err = dbc.DB.NewSelect().
		Model(actual).
		Where("? = ?", bun.Ident("pipeline_file"), actual.PipelineFile).
		Relation("Steps").
		Scan(dbc.Ctx)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, expected.PipelinePath, actual.PipelinePath, "Expected Pipeline Path %s but got", expected.PipelinePath, actual.PipelinePath)
	assert.Equal(t, expected.PipelineFile, actual.PipelineFile, "Expected Pipeline file %s but got", expected.PipelineFile, actual.PipelineFile)
	assert.Equal(t, actual.CreatedAt.UTC(), expected.CreatedAt.UTC(), "Actual Created At %s and Expected Created At %s", actual.CreatedAt.UTC(), expected.CreatedAt.UTC())

	assert.Equal(t, 4, len(actual.Steps))

	tearDown()
}

func tearDown() {
	os.Remove("testdata/test.db")
}
