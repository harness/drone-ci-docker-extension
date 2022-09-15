import React from 'react';
import { Button, Typography, Grid, Backdrop, CircularProgress } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import { getDockerDesktopClient } from '../../utils';
import { useAppDispatch } from '../../app/hooks';
import { loadStages } from '../../features/pipelinesSlice';
import { Pipeline, Stage } from '../../features/types';
import * as _ from 'lodash';

export default function ImportOrLoadStages({ ...props }) {
  const ddClient = getDockerDesktopClient();
  const dispatch = useAppDispatch();

  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);

  const savePipelines = async (droneFiles) => {
    setActionInProgress(true);

    try {
      const response = (await ddClient.extension.vm.service.post('/stages', droneFiles)) as Stage[];

      console.debug('API Response %s', JSON.stringify(response));

      //Group Stages
      const groupedStages = _.groupBy(response, 'pipelineFile');
      console.debug('Grouped Stages %s', JSON.stringify(groupedStages));

      const pipelines = new Array<Pipeline>();
      for (const [key, value] of Object.entries(groupedStages)) {
        pipelines.push({
          pipelineFile: key,
          stages: value
        } as Pipeline);
      }

      if (pipelines.length > 0) {
        dispatch(loadStages(pipelines));
        ddClient.desktopUI.toast.success(`Successfully imported stages`);
      }
    } catch (error) {
      console.debug(error);
      ddClient.desktopUI.toast.error(`Error importing pipelines : ${JSON.stringify(error)}`);
    } finally {
      setActionInProgress(false);
      props.onClose();
    }
  };
  const selectStageFromDir = async () => {
    const result = await ddClient.desktopUI.dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select base directory to discover pipelines'
    });

    if (result.canceled) {
      return;
    }

    try {
      const cmd = await ddClient.extension.host.cli.exec('pipelines-finder', ['-path', result.filePaths[0]]);
      console.debug(' Pipeline find %s', JSON.stringify(cmd.stdout));
      if (cmd.stdout) {
        const droneFiles = JSON.parse(cmd.stdout);
        console.debug('Drone files %s', droneFiles.length);
        savePipelines(droneFiles);
      } else if (cmd.stderr) {
        ddClient.desktopUI.toast.error(`Error importing pipelines : ${JSON.stringify(cmd.stderr)}`);
      }
    } catch (err) {
      console.debug(JSON.stringify(err));
      props.onClose();
      ddClient.desktopUI.toast.error(`Error importing pipelines : ${JSON.stringify(err.stderr)}`);
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Import Pipelines</DialogTitle>
      <DialogContent>
        <Backdrop
          sx={{
            backgroundColor: 'rgba(245,244,244,0.4)',
            zIndex: (theme) => theme.zIndex.drawer + 1
          }}
          open={actionInProgress}
        >
          <CircularProgress color="info" />
        </Backdrop>

        <Grid
          container
          direction="column"
          spacing={2}
        >
          <Grid item>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Choose base directory to search drone pipelines
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          disabled={actionInProgress}
          onClick={() => {
            props.onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={actionInProgress}
          onClick={selectStageFromDir}
        >
          Search
        </Button>
      </DialogActions>
    </Dialog>
  );
}
