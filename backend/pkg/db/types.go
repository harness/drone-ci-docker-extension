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

//Stage represents Drone Stage
type Stage struct {
	bun.BaseModel `bun:"table:stages,alias:s"`

	ID           int          `bun:",pk,autoincrement"`
	PipelineFile string       `bun:",notnull" json:"pipelineFile"`
	PipelinePath string       `bun:",notnull" json:"pipelinePath"`
	StageName    string       `bun:",notnull" json:"stageName"`
	Status       Status       `bun:",notnull" json:"status"`
	Steps        []*StageStep `bun:"rel:has-many,join:id=stage_id"`
	Logs         []byte       `json:"logs"`
	CreatedAt    time.Time    `bun:",nullzero,notnull,default:current_timestamp" json:"-"`
	ModifiedAt   time.Time    `json:"-"`
}

//StageStep represents Stage step
type StageStep struct {
	bun.BaseModel `bun:"table:stage_steps,alias:st"`

	ID         int       `bun:",pk,autoincrement"`
	Name       string    `bun:",notnull" json:"name"`
	Image      string    `bun:",notnull" json:"image"`
	Status     Status    `bun:",notnull" json:"status"`
	StageID    int       `bun:",notnull" json:"-"`
	CreatedAt  time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"-"`
	ModifiedAt time.Time `json:"-"`
}
