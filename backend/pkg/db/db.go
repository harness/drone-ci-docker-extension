package db

import (
	"context"
	"database/sql"
	"fmt"
	"sync"

	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/extra/bundebug"
)

//Config configures the database to initialize
type Config struct {
	ctx    context.Context
	dbOnce sync.Once
	log    *logrus.Logger
	dbFile string
	db     *bun.DB
}

//New creates a new instance of Config to create and initialize new database
func New(ctx context.Context, log *logrus.Logger, dbFile string) *Config {
	db := &Config{
		ctx:    ctx,
		log:    log,
		dbFile: dbFile,
	}

	return db
}

//Init initializes the database
func (c *Config) Init() *bun.DB {
	c.dbOnce.Do(func() {
		log := c.log
		log.Info("Initializing DB")
		sqlite, err := sql.Open(sqliteshim.ShimName, fmt.Sprintf("file:%s?cache=shared", c.dbFile))
		if err != nil {
			log.Fatal(err)
		}

		db := bun.NewDB(sqlite, sqlitedialect.New())

		if err := db.Ping(); err != nil {
			log.Fatal(err)
		}
		log.Infoln("Connected to the database")
		db.AddQueryHook(bundebug.NewQueryHook(
			bundebug.WithVerbose(logrus.GetLevel() == logrus.DebugLevel),
			bundebug.FromEnv(""),
		))
		c.db = db

		//Setup Schema
		if err := c.createTables(); err != nil {
			log.Fatal(err)
		}
	})

	return c.db
}

func (c *Config) createTables() error {
	//Pipelines
	if _, err := c.db.NewCreateTable().
		Model((*Pipeline)(nil)).
		IfNotExists().
		Exec(c.ctx); err != nil {
		return err
	}
	//Stages
	if _, err := c.db.NewCreateTable().
		Model((*Stage)(nil)).
		IfNotExists().
		ForeignKey(`("pipeline_id") REFERENCES pipeline("id") ON DELETE CASCADE`).
		Exec(c.ctx); err != nil {
		return err
	}
	//Stage Steps
	if _, err := c.db.NewCreateTable().
		Model((*StageStep)(nil)).
		IfNotExists().
		ForeignKey(`("stage_id") REFERENCES stages("id") ON DELETE CASCADE`).
		Exec(c.ctx); err != nil {
		return err
	}

	return nil
}

// func (c *Config) resetTables() error {
// 	if err := c.db.ResetModel(c.ctx, (*Pipeline)(nil)); err != nil {
// 		return err
// 	}
// 	if err := c.db.ResetModel(c.ctx, (*Stage)(nil)); err != nil {
// 		return err
// 	}
// 	if err := c.db.ResetModel(c.ctx, (*StageStep)(nil)); err != nil {
// 		return err
// 	}
// 	return nil
// }
