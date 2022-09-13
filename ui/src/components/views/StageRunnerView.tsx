import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { pipelineDisplayName, pipelinePath, vscodeURI } from '../../utils';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import RemovePipelineDialog from '../dialogs/RemovePipelineDialog';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import RunPipelineDialog from '../dialogs/RunPipelineDialog';
import { useSelector } from 'react-redux';
import {
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { selectStagesByPipeline, refreshPipelines } from '../../features/pipelinesSlice';
import { StepStatus } from '../StepStatus';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { useAppDispatch } from '../../app/hooks';
import { RootState } from '../../app/store';
import React from 'react';
import _ from 'lodash';

function useQuery(loc) {
  const { search } = loc;
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const StageRunnerView = (props) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState('\n');
  const dispatch = useAppDispatch();
  const [logFollow, setFollow] = useState(true);
  const loc = useLocation();
  const query = useQuery(loc);

  const pipelineFile = query.get('file');
  const stages = useSelector((state: RootState) => selectStagesByPipeline(state, pipelineFile));

  const [workspacePath, setWorkspacePath] = useState('');

  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [openRunPipeline, setOpenRunPipeline] = useState(false);

  useEffect(() => {
    const wsPath = pipelinePath(pipelineFile);
    //console.log('Workspace Path %s', wsPath);
    setWorkspacePath(wsPath);

    const runPipeline = query.get('runPipeline');
    if (runPipeline && runPipeline === 'true') {
      setOpenRunPipeline(true);
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
  }, [pipelineFile]);

  const navigateToHome = async () => {
    setRemoveConfirm(false);
    const url = `/?extension_name=${query.get('extension_name')}&hasBackend=${query.get('hasBackend')}`;
    //console.log('View Return URL %s', url);
    navigate(url, { replace: true });
  };
  /* Handlers */

  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRunPipeline = () => {
    setOpenRunPipeline(true);
  };

  const handleRunPipelineDialogClose = () => {
    setOpenRunPipeline(false);
  };

  const logHandler = (data: any | undefined, clean?: boolean) => {
    if (clean) {
      setLogs('');
      return true;
    }
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

  const StageItem = ({ step }) => {
    return (
      <ListItemButton>
        <ListItemIcon>
          <StepStatus status={step.status} />
        </ListItemIcon>
        <ListItemText primary={step.name} />
      </ListItemButton>
    );
  };

  const MemoizedStageItem = React.memo(StageItem);

  const Stage = ({ stage }) => {
    return (
      <>
        <Stack sx={{ pt: 2 }}>
          <Typography variant="button">{stage.name}</Typography>
          <List
            component="div"
            disablePadding
          >
            {stage.steps &&
              stage.steps.map((step) => {
                return (
                  <MemoizedStageItem
                    key={`${stage.id}-${step.name}`}
                    step={step}
                  />
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
  };

  const MemoizedStages = React.memo(Stage);

  const StageList = stages.map((s) => {
    return (
      <MemoizedStages
        key={s.id}
        stage={s}
      />
    );
  });

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
            <Tooltip
              title={pipelineFile}
              sx={{
                textTransform: 'lowercase'
              }}
            >
              <Typography
                variant="button"
                fontSize="large"
                sx={{
                  textTransform: 'lowercase'
                }}
              >
                {pipelineDisplayName(pipelineFile)}
              </Typography>
            </Tooltip>
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
                onClose={navigateToHome}
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
          <Stack
            direction="column"
            sx={{ paddingTop: 2, marginBottom: 2 }}
          >
            <Typography variant="h3">Stages</Typography>
            {stages && StageList}
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
