import React from 'react';
import { Button, Typography, Grid, Backdrop, CircularProgress } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import { getDockerDesktopClient } from '../utils';
import { useAppDispatch } from '../app/hooks';
import { loadPipelines } from '../features/pipelinesSlice';
import { Pipeline } from '../features/types';

export default function ImportDialog({ ...props }) {
  const ddClient = getDockerDesktopClient();
  const dispatch = useAppDispatch();

  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);

  const savePipelines = async (droneFiles) => {
    setActionInProgress(true);

    try {
      const response = (await ddClient.extension.vm.service.post('/pipeline', droneFiles)) as Pipeline[];

      console.log('API Response %s', JSON.stringify(response));

      if (response) {
        dispatch(loadPipelines(response));
        ddClient.desktopUI.toast.success(`Successfully imported pipelines`);
      }
    } catch (error) {
      console.log(error);
      ddClient.desktopUI.toast.error(`Error importing pipelines : ${JSON.stringify(error)}`);
    } finally {
      setActionInProgress(false);
      props.onClose();
    }
  };
  const selectDronePipelines = async () => {
    const result = await ddClient.desktopUI.dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select base directory to discover pipelines'
    });
    if (result.canceled) {
      return;
    }

    try {
      const cmd = await ddClient.extension.host.cli.exec('pipelines-finder', ['-path', result.filePaths[0]]);
      console.log(' Pipeline find %s', JSON.stringify(cmd.stdout));
      if (cmd.stdout) {
        const droneFiles = JSON.parse(cmd.stdout);
        console.log('Drone files %s', droneFiles.length);
        savePipelines(droneFiles);
      }
    } catch (err) {
      console.log(err);
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
          onClick={() => {
            props.onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={selectDronePipelines}
        >
          Search
        </Button>
      </DialogActions>
    </Dialog>
  );
}
