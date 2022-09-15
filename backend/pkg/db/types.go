package db

import (
	"sort"
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
	//2 represents running stage/step
	Running
	//3 represents failed stage/step
	Error
)

func (s Status) String() string {
	switch s {
	case 1:
		return "success"
	case 2:
		return "running"
	case 3:
		return "error"
	default:
		return "none"
	}
}

//Stage represents Drone Stage
type Stage struct {
	bun.BaseModel `bun:"table:stages,alias:s"`

	ID           int       `bun:",pk,autoincrement" json:"id"`
	PipelineFile string    `bun:",notnull" json:"pipelineFile"`
	PipelinePath string    `bun:",notnull" json:"pipelinePath"`
	Name         string    `bun:",notnull" json:"name"`
	Status       Status    `bun:",notnull" json:"status"`
	Steps        Steps     `bun:"rel:has-many,join:id=stage_id" json:"steps"`
	Logs         []byte    `json:"logs"`
	CreatedAt    time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"-"`
	ModifiedAt   time.Time `json:"-"`
}

//StageStep represents Stage step
type StageStep struct {
	bun.BaseModel `bun:"table:stage_steps,alias:st"`

	ID         int       `bun:",pk,autoincrement" json:"id"`
	Name       string    `bun:",notnull" json:"name"`
	Image      string    `bun:",notnull" json:"image"`
	Status     Status    `bun:",notnull" json:"status"`
	StageID    int       `bun:",notnull" json:"stageId"`
	CreatedAt  time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"-"`
	ModifiedAt time.Time `json:"-"`
}

type Stages []*Stage
type Steps []*StageStep

var _ sort.Interface = (Stages)(nil)
var _ sort.Interface = (Steps)(nil)

// Len implements sort.Interface
func (s Stages) Len() int {
	return len(s)
}

// Less implements sort.Interface
func (s Stages) Less(i int, j int) bool {
	return s[i].PipelineFile < s[j].PipelineFile
}

// Swap implements sort.Interface
func (s Stages) Swap(i int, j int) {
	s[i], s[j] = s[j], s[i]
}

// Len implements sort.Interface
func (ss Steps) Len() int {
	return len(ss)
}

// Less implements sort.Interface
func (ss Steps) Less(i int, j int) bool {
	return ss[i].Name < ss[j].Name
}

// Swap implements sort.Interface
func (ss Steps) Swap(i int, j int) {
	ss[i], ss[j] = ss[j], ss[i]
}
