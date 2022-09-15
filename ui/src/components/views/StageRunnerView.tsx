import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDockerDesktopClient, md5, pipelineDisplayName, pipelinePath, vscodeURI } from '../../utils';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import RemovePipelineDialog from '../dialogs/RemovePipelineDialog';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import RunPipelineDialog from '../dialogs/RunPipelineDialog';
import { useSelector } from 'react-redux';
import {
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
import { selectStagesByPipeline, refreshPipelines } from '../../features/pipelinesSlice';
import { StepStatus } from '../StepStatus';
import { LazyLog, ScrollFollow } from 'react-lazylog';
import { RootState } from '../../app/store';
import React from 'react';
import _ from 'lodash';
import { Stage, Status } from '../../features/types';
import { ExecProcess } from '@docker/extension-api-client-types/dist/v1';
import { useAppDispatch } from '../../app/hooks';

function useQuery(loc) {
  const { search } = loc;
  return useMemo(() => new URLSearchParams(search), [search]);
}

export const StageRunnerView = (props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logs, setLogs] = useState('\n');
  const [refreshSelectedStep, setRefreshSelectedStep] = useState(false);
  const [logReaderContainerID, setLogReaderContainerID] = useState<undefined | string>();
  const [logReaderExec, setLogReaderExec] = useState<undefined | ExecProcess>();
  const ddClient = getDockerDesktopClient();
  const [logFollow, setFollow] = useState(true);
  const [selectedStep, setSelectedStep] = useState(null);
  const loc = useLocation();
  const query = useQuery(loc);

  const pipelineFile = query.get('file');
  const stages = useSelector((state: RootState) => selectStagesByPipeline(state, pipelineFile));

  const [workspacePath, setWorkspacePath] = useState('');

  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [openRunPipeline, setOpenRunPipeline] = useState(false);

  const showLogs = async (stage, step) => {
    setSelectedStep(step.name);
    if (logReaderExec) {
      logReaderExec.close();
      setLogs('');
    }
    console.debug('Show logs for Stage %s and step %s', JSON.stringify(stage), JSON.stringify(step));
    let execCmdArgs = [];
    let execCmd: string;
    switch (step.status) {
      case Status.SUCCESS:
      case Status.ERROR: {
        if (logReaderContainerID) {
          execCmd = 'exec';
          execCmdArgs = [logReaderContainerID, 'cat', `/data/logs/${stage.id}/${md5(step.name)}.log`];
        }
        break;
      }
      default: {
        const out = await ddClient.docker.cli.exec('ps', [
          '--all',
          '--latest',
          '--filter',
          `'label=io.drone.stage.name=${stage.name}'`,
          '--filter',
          `'label=io.drone.step.name=${step.name}'`,
          '--filter',
          `'label=io.drone.desktop.pipeline.file=${stage.pipelineFile}'`,
          "--format '{{.ID}}'",
          '--no-trunc'
        ]);

        console.info('Pipeline Step Container ID %s', JSON.stringify(out));
        if (out.stdout) {
          execCmd = 'logs';
          execCmdArgs = ['--follow', out.stdout.trim()];
        } else if (out.stderr) {
          ddClient.desktopUI.toast.error(`Error while getting logs for step ${step.name} of stage ${stage.name}`);
        }
        break;
      }
    }
    if (execCmd && execCmdArgs.length > 0) {
      console.debug('Exec command %s', execCmd);
      const exec = await ddClient.docker.cli.exec(execCmd, execCmdArgs, {
        stream: {
          onOutput(data) {
            if (data) {
              const out = data.stdout;
              const err = data.stderr;
              if (out) {
                setLogs((oldLog) => oldLog + `\n${out}`);
              } else if (err) {
                setLogs((oldLog) => oldLog + `\n${err}`);
              }
            }
          },
          onError(error) {
            console.error(error);
          },
          splitOutputLines: true
        }
      });
      setLogReaderExec(exec);
    }
  };

  /*
   * Check if the stage has any running steps, if one then
   * make that step as selected in the list. If not make the first
   * step selected by default
   */
  const computeSelected = (stage: Stage) => {
    if (!selectedStep || refreshSelectedStep) {
      const steps = stage.steps;
      if (stage.status !== Status.RUNNING) {
        setSelectedStep(steps[0].name);
        showLogs(stage, steps[0]);
        return true;
      }
      const rStep = steps.find((s) => s.status === Status.RUNNING);
      setSelectedStep(rStep.name);
      showLogs(stage, rStep);
      return true;
    }
    return true;
  };

  useEffect(() => {
    const wsPath = pipelinePath(pipelineFile);
    console.debug('Workspace Path %s', wsPath);
    setWorkspacePath(wsPath);

    const runPipeline = query.get('runPipeline');
    if (runPipeline && runPipeline === 'true') {
      setOpenRunPipeline(true);
    }

    const getLogReaderContainerID = async () => {
      const out = await ddClient.docker.cli.exec('ps', [
        '--filter',
        "'name=log-reader'",
        "--format '{{.ID}}'",
        '--no-trunc'
      ]);
      console.debug('Log Reader PS out %s', JSON.stringify(out));
      if (out.stdout) {
        setLogReaderContainerID(out.stdout.trim());
      }
    };
    getLogReaderContainerID();
    return () => {
      if (logReaderExec) {
        logReaderExec.close();
      }
    };
  }, [pipelineFile]);

  useEffect(() => {
    let process;
    const extensionContainersEvents = async () => {
      console.debug("listening to extension's container events...");
      process = await ddClient.docker.cli.exec(
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
          'label=com.docker.compose.project=drone_drone-ci-docker-extension-desktop-extension',
          '--filter',
          'label=io.drone.desktop.ui.refresh=true'
        ],
        {
          stream: {
            onOutput() {
              dispatch(refreshPipelines());
            },
            onError(error) {
              console.error(error);
            },
            onClose(exitCode) {
              console.debug('onClose with exit code ' + exitCode);
            },
            splitOutputLines: true
          }
        }
      );
    };

    extensionContainersEvents();
    return () => {
      if (process) {
        process.close();
      }
    };
  }, []);

  useMemo(() => {
    console.debug('Reader Log Container ID ' + logReaderContainerID);
    let defaultStage = stages.find((s) => {
      const runningStep = s.steps.find((s2) => s2.status === Status.RUNNING);
      if (!runningStep) {
        return s;
      }
    });

    if (!defaultStage) {
      if (stages.length === 1) {
        defaultStage = stages[0];
      }
    }
    setRefreshSelectedStep(true);
    computeSelected(defaultStage);
    console.debug('Default Stage %s', JSON.stringify(defaultStage));
  }, [logReaderContainerID]);

  const navigateToHome = async () => {
    setRemoveConfirm(false);
    const url = `/?extension_name=${query.get('extension_name')}&hasBackend=${query.get('hasBackend')}`;
    console.debug('View Return URL %s', url);
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
    console.debug('logHandler: clean : %s', clean);
    if (clean) {
      setLogs('');
    }
    console.debug('Data %s', JSON.stringify(data));
    if (data) {
      console.debug('Running stage %s', JSON.stringify(data));
      computeSelected(data.stage);
    }
  };

  const StageItem = ({ stage, step }) => {
    return (
      <ListItemButton
        onClick={() => showLogs(stage, step)}
        selected={step.name === selectedStep}
      >
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
                    stage={stage}
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
                extraLines={1}
                stream={true}
                selectableLines={true}
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
