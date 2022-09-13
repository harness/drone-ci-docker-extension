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

type Option func(*Config)

func WithContext(ctx context.Context) Option {
	return func(c *Config) {
		if ctx == nil {
			ctx = context.Background()
		}
		c.Ctx = ctx
	}
}

func WithLogger(log *logrus.Logger) Option {
	return func(c *Config) {
		c.Log = log
	}
}

func WithDBFile(dbFile string) Option {
	return func(c *Config) {
		if dbFile == "" {
			dbFile = "/data/db"
		}
		c.DBFile = dbFile
	}
}

//New creates a new instance of Config to create and initialize new database
func New(options ...Option) *Config {
	cfg := &Config{}
	for _, o := range options {
		o(cfg)
	}

	return cfg
}

//Init initializes the database with the given configuration
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
