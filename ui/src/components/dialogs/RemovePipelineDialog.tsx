import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography
} from '@mui/material';
import { useAppDispatch } from '../../app/hooks';
import { getDockerDesktopClient } from '../../utils';
import { removeStages } from '../../features/pipelinesSlice';

export default function RemovePipelineDialog({ ...props }) {
  const dispatch = useAppDispatch();
  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);

  const ddClient = getDockerDesktopClient();

  const handleDeletePipeline = async () => {
    setActionInProgress(true);
    let response;
    try {
      const pipelineFiles = props.selectedToRemove;
      //console.log('Removing Pipelines ' + JSON.stringify(pipelineFiles));
      if (pipelineFiles && pipelineFiles.length === 1) {
        response = await ddClient.extension.vm.service.delete(`/pipeline/${pipelineFiles[0]}`);
        dispatch(removeStages(pipelineFiles));
      } else if (pipelineFiles && pipelineFiles.length > 1) {
        pipelineFiles.forEach(async (pf) => {
          //console.log('Remove  pipeline %s', pf);
          response = await ddClient.extension.vm.service.delete(`/pipeline/${pf}`);
        });
      }
    } catch (err) {
      ddClient.desktopUI.toast.error(`Error removing pipelines ${err?.message}`);
    } finally {
      setActionInProgress(false);
      props.onClose(response);
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Remove pipelines ?</DialogTitle>
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
              Are you sure of removing the pipeline(s)?
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
          onClick={handleDeletePipeline}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}
