package db

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/schema"
)

var _ bun.AfterCreateTableHook = (*Stage)(nil)
var _ bun.BeforeAppendModelHook = (*Stage)(nil)
var _ bun.AfterCreateTableHook = (*StageStep)(nil)
var _ bun.BeforeAppendModelHook = (*StageStep)(nil)

func (*Stage) AfterCreateTable(ctx context.Context, query *bun.CreateTableQuery) error {
	_, err := query.DB().NewCreateIndex().
		Model((*Stage)(nil)).
		Index("pipeline_stage_idx").
		Unique().
		Column("stage_name", "pipeline_file").
		IfNotExists().
		Exec(ctx)
	return err
}

// BeforeAppendModel implements schema.BeforeAppendModelHook
func (m *Stage) BeforeAppendModel(ctx context.Context, query schema.Query) error {
	switch query.(type) {
	case *bun.InsertQuery:
		m.CreatedAt = time.Now()
	case *bun.UpdateQuery:
		m.ModifiedAt = time.Now()
	}
	return nil
}

func (*StageStep) AfterCreateTable(ctx context.Context, query *bun.CreateTableQuery) error {
	_, err := query.DB().NewCreateIndex().
		Model((*StageStep)(nil)).
		Index("stage_step_idx").
		Unique().
		Column("name", "stage_id").
		IfNotExists().
		Exec(ctx)
	return err
}

// BeforeAppendModel implements schema.BeforeAppendModelHook
func (m *StageStep) BeforeAppendModel(ctx context.Context, query schema.Query) error {
	switch query.(type) {
	case *bun.InsertQuery:
		m.CreatedAt = time.Now()
	case *bun.UpdateQuery:
		m.ModifiedAt = time.Now()
	}
	return nil
}
