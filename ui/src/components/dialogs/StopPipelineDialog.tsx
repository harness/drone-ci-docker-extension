import React from 'react';
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
import { getDockerDesktopClient, md5 } from '../../utils';

export default function StopPipelineDialog({ ...props }) {
  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);

  const ddClient = getDockerDesktopClient();
  const { pipelineFile } = props;

  const handleStopPipeline = async () => {
    setActionInProgress(true);
    try {
      console.log("Stop Pipeline with id %s ", pipelineFile)
      const pipelineId = md5(pipelineFile);
      await ddClient.extension.host.cli.exec("kill-drone", [pipelineId]);
      ddClient.desktopUI.toast.success(`Pipeline ${pipelineFile} successfully stopped`);
    } catch (err) {
      console.log("ERR %s",JSON.stringify(err))
      ddClient.desktopUI.toast.error(`Error stopping pipeline, ${err?.stderr}`);
    } finally {
      props.onClose();
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>Stop Pipeline Run?</DialogTitle>
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
              Are you sure of stop the pipeline run?
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
          onClick={handleStopPipeline}
        >
          Stop
        </Button>
      </DialogActions>
    </Dialog>
  );
}
