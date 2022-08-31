import { useEffect, useState } from 'react';
import { Button, Grid, Stack, Typography } from '@mui/material';
import ImportDialog from './components/ImportPipelineDialog';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { PipelinesTable } from './components/PipelinesTable';
import { getDockerDesktopClient } from './utils';

export function App() {
  const [openImportDialog, setOpenImportDialog] = useState<boolean>(false);

  /* Handlers */
  const handleImportPipeline = () => {
    setOpenImportDialog(true);
  };

  const handleImportDialogClose = () => {
    setOpenImportDialog(false);
  };
  /* End of Handlers */

  useEffect(() => {
    //nothing to do while loading ...
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
          Do Continuous Integrations (CI) on your computer.
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
              endIcon={<AddCircleIcon />}
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
