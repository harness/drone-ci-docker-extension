import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk, RootState } from '../app/store';
import { getDockerDesktopClient } from '../utils';
import { Pipeline, PipelinesState, PipelineStatus, StepCountPayload, StepPayload } from './types';
import * as _ from 'lodash';

const initialState: PipelinesState = {
  status: 'idle',
  rows: []
};

const ddClient = getDockerDesktopClient();

function computePipelineStatus(state, pipelineId): PipelineStatus {
  const pipeline = _.find(state.rows, { id: pipelineId });

  //console.log('Pipeline ' + JSON.stringify(pipeline));
  if (pipeline) {
    const steps = pipeline.steps;

    const runningSteps = _.filter(steps, (s) => s.status?.toLowerCase() === 'start');

    const erroredSteps = _.filter(steps, (s) => s.status?.toLowerCase() === 'error');

    const allDoneSteps = _.filter(steps, (s) => s.status?.toLowerCase() === 'done');

    return {
      total: steps?.length,
      running: runningSteps?.length,
      error: erroredSteps?.length,
      done: allDoneSteps?.length
    };
  }
}

export const importPipelines = createAsyncThunk('pipelines/loadPipelines', async () => {
  const response = (await ddClient.extension.vm.service.get('/pipelines')) as Pipeline[];
  //console.log('Loading pipelines from backend %s', response.length);
  return response;
});

export const savePipelines = (): AppThunk => async (_dispatch, getState) => {
  const currState = getState().pipelines;
  const pipelines = currState.rows;
  //console.log('Saving pipelines to backend ' + JSON.stringify(pipelines));
  if (pipelines?.length > 0) {
    try {
      await ddClient.extension.vm.service.post('/pipeline', pipelines);
      // console.log('Saved pipelines' + JSON.stringify(response));
    } catch (err) {
      console.error('Error Saving' + JSON.stringify(err));
      ddClient.desktopUI.toast.error(`Error saving pipelines ${err.message}`);
    }
  }
};

export const pipelinesSlice = createSlice({
  name: 'pipelines',
  initialState,
  reducers: {
    loadPipelines: (state, action: PayloadAction<Pipeline[]>) => {
      state.status = 'loaded';
      const newRows = rowsFromPayload(action.payload);
      // console.log('Existing Rows ', JSON.stringify(state.rows));
      // console.log('New Rows ', JSON.stringify(newRows));
      state.rows = _.unionBy(state.rows, newRows, 'id');
    },
    updateStep: (state, action: PayloadAction<StepPayload>) => {
      //console.log('Action::' + action.type + '::' + JSON.stringify(action.payload));
      const { pipelineID, step } = action.payload;
      const idx = _.findIndex(state.rows, { id: pipelineID });
      if (idx != -1) {
        // console.log(' Update Found::' + idx + '::' + JSON.stringify(state.rows[idx]));
        const oldSteps = state.rows[idx].steps;
        const stepIdx = _.findIndex(oldSteps, { name: step.name });
        //console.log('Update Found Step::' + stepIdx + '::' + JSON.stringify(oldSteps));
        if (stepIdx != -1) {
          oldSteps[stepIdx] = step;
          state.rows[idx].steps = oldSteps;
          updatePipelineStatus(state, pipelineID);
        }
      }
    },
    deleteSteps: (state, action: PayloadAction<StepPayload>) => {
      //console.log("Action::" + action.type + "::" + action.payload);
      const { pipelineID, step } = action.payload;
      const idx = _.findIndex(state.rows, { id: pipelineID });
      if (idx != -1) {
        const j = _.findIndex(state.rows[idx].steps, { name: step.name });
        state.rows[idx].steps.splice(j, 1);
      }
    },
    updateStepCount: (state, action: PayloadAction<StepCountPayload>) => {
      const { pipelineID, status } = action.payload;
      const idx = _.findIndex(state.rows, { id: pipelineID });
      if (idx != -1) {
        state.rows[idx].status.total = status.total;
      }
    },
    pipelineStatus: (state, action: PayloadAction<string>) => {
      //console.log("Action::pipelineStatus::Payload" + action.payload);
      const pipelineID = action.payload;
      updatePipelineStatus(state, pipelineID);
    },
    removePipelines: (state, action: PayloadAction<string[]>) => {
      const pipelineIds = action.payload;
      // console.log('Action::removePipelines::Payload' + JSON.stringify(pipelineIds));
      state.rows = _.remove(state.rows, (o) => !_.includes(pipelineIds, o.id));
    },
    resetPipelineStatus: (state, action: PayloadAction<StepCountPayload>) => {
      const { pipelineID, status } = action.payload;
      const idx = _.findIndex(state.rows, { id: pipelineID });
      if (idx != -1) {
        state.rows[idx].status.total = status.total;
        state.rows[idx].status.error = status.error;
        state.rows[idx].status.running = status.running;
        state.rows[idx].status.done = status.done;
        //reset step statuses
        state.rows[idx].steps.forEach((step) => {
          step.status = 'reset';
        });
      }
      updatePipelineStatus(state, pipelineID);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(importPipelines.pending, (state) => {
        state.status = 'loading';
        state.rows = [];
      })
      .addCase(importPipelines.fulfilled, (state, action) => {
        state.status = 'loaded';
        state.rows = rowsFromPayload(action.payload);
      })
      .addCase(importPipelines.rejected, (state) => {
        state.status = 'failed';
        state.rows = [];
      });
  }
});

export const {
  loadPipelines,
  pipelineStatus,
  updateStep,
  deleteSteps,
  removePipelines,
  updateStepCount,
  resetPipelineStatus
} = pipelinesSlice.actions;

export const selectRows = (state: RootState) => state.pipelines.rows;
export const dataLoadStatus = (state: RootState) => state.pipelines.status;

function updatePipelineStatus(state, pipelineId: string) {
  const status = computePipelineStatus(state, pipelineId);
  //console.log('Update Pipeline Status..' + JSON.stringify(status));
  const idx = _.findIndex(state.rows, { id: pipelineId });
  if (idx != -1) {
    state.rows[idx].status.error = status.error;
    state.rows[idx].status.running = status.running;
    state.rows[idx].status.done = status.done;
  }
}

function rowsFromPayload(payload: Pipeline[]) {
  //console.log('Received Payload ' + JSON.stringify(payload));
  const rows = [];
  payload.map((v) => {
    rows.push({
      id: v.id,
      pipelinePath: v.pipelinePath,
      stageName: v.stageName?.replace(/[\n\r]/g, ''),
      pipelineFile: v.pipelineFile,
      steps: v?.steps,
      status: v?.status
    });
  });
  return rows;
}

export default pipelinesSlice.reducer;
