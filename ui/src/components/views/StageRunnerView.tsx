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
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { selectRows } from '../../features/pipelinesSlice';
import { Stage } from '../../features/types';
import { StepStatus } from '../StepStatus';

function useQuery(loc) {
  const { search } = loc;
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const StageRunnerView = (props) => {
  const navigate = useNavigate();
  const [value, setValue] = useState(0);
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
            sx={{
              padding: '2',
              margin: 2
            }}
          >
            <Stack
              spacing={4}
              direction="column"
            >
              <Typography variant="h3">Stages</Typography>
              {stages.map((s) => {
                // {
                //   console.log('Stage %s', JSON.stringify(s));
                // }
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
                      sx={{
                        width: '100vw'
                      }}
                      flexItem
                    />
                  </>
                );
              })}
            </Stack>
          </Grid>
          <Divider
            orientation="vertical"
            sx={{
              height: '100vh'
            }}
            flexItem
          />
          <ScrollFollow
            startFollowing={logFollow}
            render={(follow, onScroll) => (
              <LazyLog
                url="http://example.log"
                stream
                follow={follow}
                onScroll={onScroll}
              />
            )}
          />
        </Grid>
      </Stack>
    </>
  );
};
