import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Grid, Stack, Typography } from '@mui/material';
import ImportOrLoadStages from './components/dialogs/ImportOrLoadStages';
import { getDockerDesktopClient } from './utils';
import { dataLoadStatus, importPipelines, refreshPipelines } from './features/pipelinesSlice';
import { useAppDispatch } from './app/hooks';
import { Pipelines } from './components/Pipelines';
export function App() {
  const [openImportDialog, setOpenImportDialog] = useState<boolean>(false);
  const pipelinesStatus = useSelector(dataLoadStatus);
  const dispatch = useAppDispatch();

  /* Handlers */
  const handleImportPipeline = () => {
    setOpenImportDialog(true);
  };

  const handleImportDialogClose = () => {
    setOpenImportDialog(false);
  };
  /* End of Handlers */

  useEffect(() => {
    //console.log('pipelinesStatus %s', pipelinesStatus);
    if (pipelinesStatus === 'idle') {
      dispatch(importPipelines());
    }
    //Show realtime status while running pipelines
    //We need to poll as currently there is no way to
    //do push from backend
    const timer = setInterval(() => {
      dispatch(refreshPipelines());
    }, 500);

    //Clear the timer on unmounting component
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Stack
      direction="column"
      alignItems="start"
      spacing={2}
      sx={{ mt: 4 }}
    >
      <Typography variant="h3">Drone Pipelines</Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mt: 2 }}
      >
        Run Continuous Integration & Delivery Pipelines (CI/CD) from within Docker Desktop.
      </Typography>
      <Grid
        container
        spacing={2}
      >
        <Grid
          item
          xs={4}
        >
          <Button
            variant="contained"
            onClick={handleImportPipeline}
          >
            Import Pipelines
          </Button>
        </Grid>
      </Grid>
      <Pipelines />
      {openImportDialog && (
        <ImportOrLoadStages
          open={openImportDialog}
          onClose={handleImportDialogClose}
        />
      )}
    </Stack>
  );
}
