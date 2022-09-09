import { Fragment, useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { vscodeURI } from '../../utils';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import RemovePipelineDialog from '../dialogs/RemoveStageDialog';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import RunPipelineDialog from '../dialogs/RunPipelineDialog';
import { useSelector } from 'react-redux';
import {
  Box,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { selectRows } from '../../features/pipelinesSlice';
import { Stage } from '../../features/types';
import { StepStatus } from '../StepStatus';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { width } from '@mui/system';
function useQuery(loc) {
  const { search } = loc;
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const StageRunnerView = (props) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState('\n');
  const [logFollow, setFollow] = useState(true);
  const loc = useLocation();
  const query = useQuery(loc);
  const pipelines = useSelector(selectRows);

  const pipelineFile = query.get('id');
  const [workspacePath, setWorkspacePath] = useState('');
  const [stages, setStages] = useState(new Array<Stage>());

  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [openRunPipeline, setOpenRunPipeline] = useState(false);

  useEffect(() => {
    const paths = pipelineFile.split('/');
    let wsPath = '';
    for (let i = 0; i < paths.length - 1; i++) {
      wsPath = wsPath + paths[i];
    }
    //console.log('Workspace Path %s', wsPath);
    setWorkspacePath(wsPath);
    setStages(pipelines.find((p) => p.pipelineFile === pipelineFile).stages);
  }, []);

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

  const logHandler = (data: any | undefined, clean?: boolean) => {
    if (data) {
      const out = data.stdout;
      const err = data.stderr;
      if (out) {
        setLogs((oldLog) => oldLog + `\n${out}`);
      } else if (err) {
        setLogs((oldLog) => oldLog + `\n${err}`);
      }
    }
  };

  const navigateToHome = async () => {
    const url = `/?extension_name=${query.get('extension_name')}&hasBackend=${query.get('hasBackend')}`;
    //console.log('View Return URL %s', url);
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
            {pipelineFile}
          </Grid>
          <Grid
            item
            sx={{
              display: 'flex',
              alignContent: 'flex-end'
            }}
          >
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
                  width="20px"
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
                selectedToRemove={[pipelineFile]}
                onClose={handleRemoveDialogClose}
              />
            )}
            {openRunPipeline && (
              <RunPipelineDialog
                open={openRunPipeline}
                onClose={handleRunPipelineDialogClose}
                pipelineID={pipelineFile}
                pipelineFile={pipelineFile}
                workspacePath={workspacePath}
                logHandler={logHandler}
              />
            )}
          </Grid>
        </Grid>
      </Stack>
      <Divider
        orientation="horizontal"
        flexItem
      />
      <Grid
        container
        spacing={2}
        columns={16}
        sx={{
          height: '100vh',
          width: '100vw'
        }}
      >
        <Grid
          item
          xs={4}
        >
          <Stack direction="column">
            <Typography variant="h3">Stages</Typography>
            {stages.map((s) => {
              return (
                <>
                  <Stack>
                    <Typography variant="button">{s.name}</Typography>
                    <List
                      component="div"
                      disablePadding
                    >
                      {s.steps &&
                        s.steps.map((step) => {
                          return (
                            <ListItemButton
                              sx={{ pl: 4 }}
                              key={step.id}
                            >
                              <ListItemIcon>
                                <StepStatus status={step.status} />
                              </ListItemIcon>
                              <ListItemText primary={step.name} />
                            </ListItemButton>
                          );
                        })}
                    </List>
                  </Stack>
                  <Divider
                    orientation="horizontal"
                    flexItem
                  />
                </>
              );
            })}
          </Stack>
        </Grid>
        <Grid
          item
          xs={12}
        >
          <ScrollFollow
            startFollowing={true}
            render={({ follow, onScroll }) => (
              <LazyLog
                text={logs}
                follow={follow}
                onScroll={onScroll}
                enableSearch={true}
              />
            )}
          />
        </Grid>
      </Grid>
    </>
  );
};
