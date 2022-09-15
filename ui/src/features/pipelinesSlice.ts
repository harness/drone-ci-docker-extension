import { createAsyncThunk, createSelector, createSlice, current, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk, RootState } from '../app/store';
import { getDockerDesktopClient } from '../utils';
import { Pipeline, PipelinesState, PipelineStatus, Stage, Status, StepCountPayload, StepPayload } from './types';
import * as _ from 'lodash';

const initialState: PipelinesState = {
  status: 'idle',
  rows: []
};

const ddClient = getDockerDesktopClient();

export const selectRows = (state: RootState) => state.pipelines;
export const dataLoadStatus = (state: RootState) => state.pipelines.status;
export const selectPipelines = createSelector([selectRows], (pipelines) => pipelines.rows);
export const selectPipelineByID = createSelector(
  [selectPipelines, (state, pipelineID) => pipelineID],
  (pipelines, pipelineID) => pipelines.find((p) => p.pipelineFile === pipelineID)
);
export const selectStagesByPipeline = createSelector(
  [selectPipelines, (state, pipelineFile) => pipelineFile],
  (pipelines, pipelineFile) => pipelines.find((p) => p.pipelineFile === pipelineFile)?.stages
);
export const selectPipelineStatus = createSelector(
  [selectPipelines, (state, pipelineFile) => pipelineFile],
  (pipelines, pipelineFile) => {
    const pipeline = pipelines.find((p) => p.pipelineFile === pipelineFile);
    let defaultStage: Stage;
    if (pipeline.stages.length === 1) {
      defaultStage = pipeline.stages[0];
    } else {
      defaultStage = pipeline.stages.find((s) => s.name === 'default');
    }
    if (defaultStage) {
      console.debug('Pipeline Status %s', JSON.stringify(defaultStage.status));
      return defaultStage.status;
    }

    return Status.NONE;
  }
);

export const importPipelines = createAsyncThunk('pipelines/loadStages', async () => {
  const response = (await ddClient.extension.vm.service.get('/stages')) as Stage[];
  console.debug('Loading pipelines from backend %s', response.length);
  const groupedStages = _.groupBy(response, 'pipelineFile');
  const pipelines = new Array<Pipeline>();
  for (const [key, value] of Object.entries(groupedStages)) {
    pipelines.push({
      pipelineFile: key,
      stages: value
    } as Pipeline);
  }
  return pipelines;
});

const runRefresh = (state: PipelinesState, groupedStages: _.Dictionary<Stage[]>) => {
  console.debug('Current State %s', JSON.stringify(state.rows));
  for (const [key, value] of Object.entries(groupedStages)) {
    console.debug('Refreshing Pipeline %s', key);
    const pipelineIdx = state.rows.findIndex((o) => o.pipelineFile === key);
    console.debug('Refreshing Pipeline Index %s', pipelineIdx);
    const pipeline = _.find(state.rows, { pipelineFile: key }) as Pipeline;
    if (pipeline) {
      pipeline.stages = [...value];
      state.rows = [...state.rows.slice(0, pipelineIdx), pipeline, ...state.rows.slice(pipelineIdx + 1)];
      console.debug('Refreshed Pipelines %s', JSON.stringify(state.rows));
    }
  }
  return state.rows;
};
export const refreshPipelines = createAsyncThunk('pipelines/refreshPipelines', async () => {
  const response = (await ddClient.extension.vm.service.get('/stages')) as Stage[];
  console.debug('Refreshing pipelines from backend %s', response.length);
  return _.groupBy(response, 'pipelineFile');
});

export const persistPipeline = createAsyncThunk(
  'pipelines/persistPipeline',
  async (payload: StepPayload, { getState }) => {
    const state = getState() as RootState;
    const pipelines = state.pipelines.rows;
    const idx = _.findIndex(pipelines, { pipelineFile: payload.pipelineID });
    if (idx != -1) {
      const pipeline = pipelines[idx];
      console.debug('Persisting Pipeline %s', JSON.stringify(pipeline));
      try {
        const stages = pipeline.stages;
        const response = await ddClient.extension.vm.service.post('/stages', stages);
        console.debug('Saved stages to DB' + JSON.stringify(response));
      } catch (err) {
        console.error('Error Saving' + JSON.stringify(err));
        ddClient.desktopUI.toast.error(`Error saving pipelines ${err.message}`);
      }
    }
  }
);

export const savePipelines = (): AppThunk => async (_dispatch, getState) => {
  const currState = getState().pipelines;
  const pipelines = currState.rows;
  console.debug('Saving pipelines to backend ' + JSON.stringify(pipelines));
  if (pipelines?.keys.length > 0) {
    try {
      await ddClient.extension.vm.service.post('/pipeline', pipelines);
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
    loadStages: (state, action: PayloadAction<Pipeline[]>) => {
      state.status = 'loaded';
      const newRows = rowsFromPayload(action.payload);
      // console.debug('Existing Rows ', JSON.stringify(state.rows));
      // console.debug('New Rows ', JSON.stringify(newRows));
      state.rows = _.unionBy(state.rows, newRows, 'pipelineFile');
    },
    updateStep: (state, action: PayloadAction<StepPayload>) => {
      console.debug('Action::' + action.type + '::' + JSON.stringify(action.payload));
      const { pipelineID, stageName, step } = action.payload;
      const pipelineIdx = state.rows.findIndex((o) => o.pipelineFile === pipelineID);
      const pipeline = _.find(state.rows, { pipelineFile: pipelineID }) as Pipeline;
      console.debug('Update Pipeline %s', JSON.stringify(pipeline));
      if (pipeline) {
        const stageIdx = _.findIndex(pipeline.stages, { name: stageName });
        const stage = pipeline.stages[stageIdx];
        console.debug('Update Stage %s', JSON.stringify(stage));
        if (stage) {
          console.debug('Updating...');
          //update stage steps
          const stepIdx = stage.steps.findIndex((s) => s.name === step.name);
          stage.steps = [...stage.steps.slice(0, stepIdx), step, ...stage.steps.slice(stepIdx + 1)];
          //update stages
          pipeline.stages = [...pipeline.stages.slice(0, stageIdx), stage, ...pipeline.stages.slice(stageIdx + 1)];
          console.debug('Updated Pipelines status %s', step.status);
          stage.status = stage.status | step.status;
          pipeline.status = pipeline.status | step.status;
          //update pipeline in the core state
          state.rows = [...state.rows.slice(0, pipelineIdx), pipeline, ...state.rows.slice(pipelineIdx + 1)];
          console.debug('Updated Pipelines size %s', state.rows.length);
        }
      }
    },

    pipelineStatus: (state, action: PayloadAction<string>) => {
      console.debug('Action::pipelineStatus::Payload' + action.payload);
    },
    removeStages: (state, action: PayloadAction<string[]>) => {
      const pipelineFiles = action.payload;
      // console.debug('Action::removePipelines::Payload' + JSON.stringify(pipelineFiles));
      state.rows = _.remove(state.rows, (o) => !_.includes(pipelineFiles, o.pipelineFile));
    },
    resetPipelineStatus: (state, action: PayloadAction<StepCountPayload>) => {
      console.debug('resetPipelineStatus');
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
        //don't do anything
      }) // not worried about rejected/pending cases as it keeps refreshing
      .addCase(refreshPipelines.fulfilled, (state, action) => {
        console.debug('refreshed');
        const groupStages = action.payload;
        runRefresh(state, groupStages);
      });
  }
});

export const { loadStages, pipelineStatus, updateStep, removeStages, resetPipelineStatus } = pipelinesSlice.actions;

function rowsFromPayload(payload: Pipeline[]) {
  console.debug('Received Payload ' + JSON.stringify(payload));
  const rows = new Array<Pipeline>();
  payload.map((v) => {
    rows.push({
      pipelineFile: v.pipelineFile,
      stages: v.stages
    } as Pipeline);
  });
  return rows;
}

export default pipelinesSlice.reducer;
