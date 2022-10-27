export enum EventStatus {
  START = 'start',
  DESTROY = 'destroy',
  STOP = 'stop',
  DIE = 'die',
  KILL = 'kill',
  PULL = 'pull'
}

export const enum Status {
  NONE = 0,
  SUCCESS,
  RUNNING,
  ERROR
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
  id?: string;
  name: string;
  image: string;
  status: Status;
  service?: number;
}

//Pipeline defines the single Pipeline row that is displayed
//in the UI
export interface Pipeline {
  pipelineFile: string;
  stages: Stage[];
  logs?: string;
  status?: Status;
}

export interface Stage {
  id: string;
  name: string;
  pipelinePath: string;
  pipelineFile: string;
  status: Status;
  steps: Step[];
}

export interface StepPayload {
  pipelineID: string;
  stageName: string;
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
  status: 'idle' | 'loading' | 'failed' | 'loaded' | 'refreshed';
  rows: Pipeline[];
}
