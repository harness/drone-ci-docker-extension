package db

import (
	"time"

	"github.com/uptrace/bun"
)

//Status Stage/Step status
type Status int

const (
	//0 represents no status typically stage/step is yet to start
	None Status = iota
	//1 represents successful stage/step
	Success
	//2 represents failed stage/step
	Failed
)

//Pipeline represents Drone pipeline
type Pipeline struct {
	bun.BaseModel `bun:"table:pipelines,alias:p"`

	ID           string    `bun:",pk"`
	PipelinePath string    `bun:",notnull"`
	PipelineFile string    `bun:",notnull"`
	CreatedAt    time.Time `bun:",nullzero,notnull,default:current_timestamp"`
	ModifiedAt   time.Time
}

//Stage represents Drone Stage
type Stage struct {
	bun.BaseModel `bun:"table:stages,alias:s"`

	ID         int64  `bun:",pk,autoincrement"`
	StageName  string `bun:",notnull"`
	Status     Status `bun:",notnull"`
	Logs       []byte
	PipelineID string    `bun:",notnull"`
	Pipeline   *Pipeline `bun:"rel:belongs-to,join:pipeline_id=id"`
	CreatedAt  time.Time `bun:",nullzero,notnull,default:current_timestamp"`
	ModifiedAt time.Time
}

//StageStep represents Stage step
type StageStep struct {
	bun.BaseModel `bun:"table:stage_steps,alias:t"`

	ID         int64     `bun:",pk,autoincrement"`
	Name       string    `bun:",notnull"`
	Image      string    `bun:",notnull"`
	Status     Status    `bun:",notnull"`
	StageID    string    `bun:",notnull"`
	Stage      *Stage    `bun:"rel:belongs-to,join:stage_id=id"`
	CreatedAt  time.Time `bun:",nullzero,notnull,default:current_timestamp"`
	ModifiedAt time.Time
}
