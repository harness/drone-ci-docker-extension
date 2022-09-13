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
  const ddClient = getDockerDesktopClient();
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
    const extensionContainersEvents = async () => {
      //console.log("listening to extension's container events...");
      await ddClient.docker.cli.exec(
        'events',
        [
          '--format',
          `"{{ json . }}"`,
          '--filter',
          'type=container',
          '--filter',
          'event=create',
          '--filter',
          'event=destroy',
          '--filter',
          'label=com.docker.compose.project=drone_drone-desktop-docker-extension-desktop-extension',
          '--filter',
          'label=io.drone.desktop.ui.refresh=true'
        ],
        {
          stream: {
            onOutput() {
              //console.log(data);
              dispatch(refreshPipelines());
            },
            onError(error) {
              console.error(error);
            },
            onClose(exitCode) {
              console.log('onClose with exit code ' + exitCode);
            },
            splitOutputLines: true
          }
        }
      );
    };

    extensionContainersEvents();
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
