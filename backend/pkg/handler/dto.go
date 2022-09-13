package handler

import "github.com/kameshsampath/drone-desktop-docker-extension/pkg/db"

type Handler struct {
	DatabaseConfig *db.Config
}

//PipelineStep represents a pipeline step
type PipelineStep struct {
	StepName  string `json:"name"`
	StepImage string `json:"image"`
	Status    string `json:"status"`
}

//PipelineStatus of the Pipeline
type PipelineStatus struct {
	Total int `json:"total"`
	Error int `json:"error"`
	Done  int `json:"done"`
}

//DronePipeline is the request data to save the Pipeline
type DronePipeline struct {
	ID           string         `json:"id"`
	StageName    string         `json:"stageName"`
	Path         string         `json:"pipelinePath"`
	PipelineFile string         `json:"pipelineFile"`
	Steps        []PipelineStep `json:"steps,omitempty"`
	Status       PipelineStatus `json:"status"`
}
