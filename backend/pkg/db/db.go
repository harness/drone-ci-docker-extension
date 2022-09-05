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
	Ctx    context.Context
	dbOnce sync.Once
	Log    *logrus.Logger
	DBFile string
	DB     *bun.DB
}

//New creates a new instance of Config to create and initialize new database
func New(ctx context.Context, log *logrus.Logger, dbFile string) *Config {
	db := &Config{
		Ctx:    ctx,
		Log:    log,
		DBFile: dbFile,
	}

	return db
}

//Init initializes the database
func (c *Config) Init() *bun.DB {
	c.dbOnce.Do(func() {
		log := c.Log
		log.Info("Initializing DB")
		sqlite, err := sql.Open(sqliteshim.ShimName, fmt.Sprintf("file:%s?cache=shared", c.DBFile))
		if err != nil {
			log.Fatal(err)
		}

		db := bun.NewDB(sqlite, sqlitedialect.New())

		if err := db.Ping(); err != nil {
			log.Fatal(err)
		}
		log.Infoln("Connected to the database")
		isVerbose := log.Level == logrus.DebugLevel || log.Level == logrus.TraceLevel
		db.AddQueryHook(bundebug.NewQueryHook(
			bundebug.WithVerbose(isVerbose),
			bundebug.WithVerbose(isVerbose),
		))
		c.DB = db

		//Setup Schema
		if err := c.createTables(); err != nil {
			log.Fatal(err)
		}
	})

	return c.DB
}

func (c *Config) createTables() error {
	//Stages
	if _, err := c.DB.NewCreateTable().
		Model((*Stage)(nil)).
		IfNotExists().
		Exec(c.Ctx); err != nil {
		return err
	}
	//Stage Steps
	if _, err := c.DB.NewCreateTable().
		Model((*StageStep)(nil)).
		IfNotExists().
		ForeignKey(`("stage_id") REFERENCES stages("id") ON DELETE CASCADE`).
		Exec(c.Ctx); err != nil {
		return err
	}

	return nil
}
