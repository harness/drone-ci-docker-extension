package utils

import (
	"io"
	"os"

	"github.com/labstack/gommon/log"
	"github.com/sirupsen/logrus"
)

//LogSetup sets up the logging for the application
func LogSetup(out io.Writer, level string) *logrus.Logger {
	lvl, err := logrus.ParseLevel(level)

	if err != nil {
		log.Warnf("Unable to use the %s level, %#v. Defaulting to warning.")
		lvl = logrus.WarnLevel
	}

	log := &logrus.Logger{
		Formatter: &logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02 15:15:10",
		},
		Out:          out,
		ReportCaller: true,
		Level:        lvl,
	}

	return log
}

//LookupEnvOrString looks up an environment variable if not found
//returns defaultVal
func LookupEnvOrString(envName, defaultVal string) string {
	if val, ok := os.LookupEnv(envName); ok {
		return val
	}

	return defaultVal
}
