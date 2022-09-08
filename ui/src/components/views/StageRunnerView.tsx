import { Fragment, useState } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate, useParams } from 'react-router-dom';
import { vscodeURI } from '../../utils';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import RemovePipelineDialog from '../dialogs/RemoveStageDialog';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import RunPipelineDialog from '../dialogs/RunPipelineDialog';
import { Box, Container, Divider, Grid, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';

export const StageRunnerView = (props) => {
  const navigate = useNavigate();
  const [value, setValue] = useState(0);
  const params = useParams();
  const loc = useLocation();
  const stageID = parseInt(params.stageId);
  console.log('Stage ID %s', stageID);
  console.log('Loc %s', loc.search);

  const { pipelineID, pipelineFile, workspacePath, logHandler, openHandler, stepCount } = props;
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [openRunPipeline, setOpenRunPipeline] = useState(false);

  /* Handlers */
  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
  };

  const handleRunPipeline = () => {
    setOpenRunPipeline(true);
  };

  const handleRunPipelineDialogClose = () => {
    setOpenRunPipeline(false);
  };

  const navigateToHome = async () => {
    const url = `/?extensionName=kameshsampath_drone-desktop-docker-extension&hasBackend=true`;
    console.log('URL %s', url);
    navigate(url, { replace: true });
  };

  return (
    <>
      <Stack
        direction="row"
        sx={{
          display: 'flex',
          bgcolor: 'background.paper',
          color: 'text.secondary',
          '& hr': {
            mx: 0.5
          },
          width: '100vw'
        }}
      >
        <Grid container>
          <Grid
            item
            xs={10}
          >
            <IconButton
              aria-label="go back"
              onClick={() => navigateToHome()}
            >
              <ArrowBackIosIcon
                color="success"
                fontSize="large"
              />
            </IconButton>
            Pipeline File{pipelineFile}
          </Grid>
          <Grid
            item
            sx={{
              display: 'flex',
              alignContent: 'flex-end'
            }}
          >
            <Tooltip title="Open in VS Code">
              <IconButton
                aria-label="edit in vscode"
                color="primary"
                href={vscodeURI(workspacePath)}
                sx={{
                  marginRight: '4px'
                }}
              >
                <img
                  src={process.env.PUBLIC_URL + '/images/vscode.png'}
                  width="24px"
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="Run Pipeline">
              <IconButton
                onClick={handleRunPipeline}
                sx={{
                  fontSize: '24px'
                }}
              >
                <PlayCircleOutlineOutlinedIcon
                  color="primary"
                  sx={{
                    fontSize: '24px'
                  }}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove Pipeline">
              <IconButton
                onClick={handleDeletePipelines}
                sx={{
                  fontSize: '24px'
                }}
              >
                <DeleteIcon
                  color="primary"
                  sx={{
                    fontSize: '24px'
                  }}
                />
              </IconButton>
            </Tooltip>
            {removeConfirm && (
              <RemovePipelineDialog
                open={removeConfirm}
                selectedToRemove={[pipelineID]}
                onClose={handleRemoveDialogClose}
              />
            )}
            {openRunPipeline && (
              <RunPipelineDialog
                open={openRunPipeline}
                onClose={handleRunPipelineDialogClose}
                pipelineID={pipelineID}
                pipelineFile={pipelineFile}
                workspacePath={workspacePath}
                logHandler={logHandler}
                openHandler={openHandler}
                stepCount={stepCount}
              />
            )}
          </Grid>
        </Grid>
      </Stack>
      <Divider
        orientation="horizontal"
        flexItem
      />
      <Stack
        direction="row"
        height="100vh"
        sx={{
          display: 'flex',
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          alignItems: 'flex-start',
          bgcolor: 'background.paper',
          color: 'text.secondary',
          '& hr': {
            mx: 0.5
          }
        }}
      >
        <Grid
          container
          sx={{ width: '100vw' }}
        >
          <Grid
            item
            xs={4}
          >
            <Typography variant="h1">Jai Guru</Typography>
          </Grid>
          <Divider
            orientation="vertical"
            flexItem
          />
          <Grid
            item
            xs={6}
          >
            <Typography variant="h1">Logs</Typography>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
};
