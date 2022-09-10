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
  FAILED,
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
  //TODO remove
  pipelineFQN?: string;
  id?: string;
  name: string;
  image: string;
  status: Status;
}

//Pipeline defines the single Pipeline row that is displayed
//in the UI
export interface Pipeline {
  pipelineFile: string;
  stages: Stage[];
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
  status: 'idle' | 'loading' | 'failed' | 'loaded';
  rows: Pipeline[];
}
