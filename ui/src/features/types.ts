export enum EventStatus {
  START = 'start',
  DESTROY = 'destroy',
  STOP = 'stop',
  DIE = 'die',
  KILL = 'kill',
  PULL = 'pull'
}

export interface Event {
  status: EventStatus;
  id: string;
  from: string;
  Actor: {
    Attributes: {
      [key: string]: string;
    };
  };
}

//Step defines the single Pipeline step row that is displayed
//in the UI
export interface Step {
  stepContainerId: string;
  pipelineFQN: string;
  stepName: string;
  stepImage: string;
  status: string;
}

//Pipeline defines the single Pipeline row that is displayed
//in the UI
export interface Pipeline {
  id: string;
  pipelineName: string;
  pipelinePath: string;
  pipelineFile: string;
  status: PipelineStatus;
  steps: Step[];
}

export interface StepPayload {
  pipelineID: string;
  step: Step;
}

export interface StepCountPayload {
  pipelineID: string;
  status: PipelineStatus;
}

export interface PipelineStatus {
  total: number;
  running?: number;
  error?: number;
  done?: number;
}

export interface PipelinesState {
  status: 'idle' | 'loading' | 'failed' | 'loaded';
  rows: Pipeline[];
}
