import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Grid, Stack, Typography } from '@mui/material';
import ImportDialog from './components/ImportPipelineDialog';
import { PipelinesTable } from './components/PipelinesTable';
import { getDockerDesktopClient } from './utils';
import { dataLoadStatus, importPipelines, pipelineStatus, selectRows } from './features/pipelinesSlice';
import { useAppDispatch } from './app/hooks';
export function App() {
  const [openImportDialog, setOpenImportDialog] = useState<boolean>(false);
  const pipelines = useSelector(selectRows);
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
    if (pipelinesStatus === 'idle') {
      dispatch(importPipelines());
    }

    return () => {
      //Write the current tstamp to a file so that we can track the events later
      const writeCurrTstamp = async () => {
        await getDockerDesktopClient().extension.vm.cli.exec('bash', ['-c', '"date +%s > /data/currts"']);
      };
      writeCurrTstamp().catch(console.error);
    };
  }, []);

  return (
    <>
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
        <PipelinesTable />
        {openImportDialog && (
          <ImportDialog
            open={openImportDialog}
            onClose={handleImportDialogClose}
          />
        )}
      </Stack>
    </>
  );
}
