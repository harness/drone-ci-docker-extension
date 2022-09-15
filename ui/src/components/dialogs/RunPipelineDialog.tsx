import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  SelectChangeEvent,
  InputBase,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import BackspaceIcon from '@mui/icons-material/Backspace';
import { getDockerDesktopClient, md5 } from '../../utils';
import { refreshPipelines, selectPipelines, selectStagesByPipeline } from '../../features/pipelinesSlice';
import * as _ from 'lodash';
import { Pipeline, Status } from '../../features/types';
import { RootState } from '../../app/store';
import { useAppDispatch } from '../../app/hooks';

export default function RunPipelineDialog({ ...props }) {
  const pipelines = useSelector(selectPipelines);
  const dispatch = useAppDispatch();
  const ddClient = getDockerDesktopClient();
  const { pipelineFile, workspacePath, logHandler } = props;
  const [pipelineSteps, setPipelineSteps] = useState<string[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline>();
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [includeStages, setIncludeStages] = React.useState<string[]>([]);
  const [includeSteps, setIncludeSteps] = React.useState<string[]>([]);
  const [dockerNetworks, setDockerNetworks] = React.useState<string[]>([]);
  const [dockerNetwork, setDockerNetwork] = React.useState<string>('');
  const [secretFile, setSecretFile] = React.useState<string>('');
  const [envFile, setEnvFile] = React.useState<string>('');
  const [trusted, setTrusted] = useState(false);

  //get the latest status with running status
  const stages = useSelector((state: RootState) => selectStagesByPipeline(state, pipelineFile));

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250
      }
    }
  };

  useEffect(() => {
    const queryNetworks = async () => {
      const cmd = await ddClient.docker.cli.exec('network', ['ls', "--format='{{.Name}}'"]);
      if (cmd.stdout) {
        const networkNames = cmd.stdout?.trim().split('\n');
        console.debug('Networks %s', JSON.stringify(networkNames));
        setDockerNetworks(networkNames);
      }
    };
    queryNetworks();
  }, []);

  useEffect(() => {
    const pipeline = pipelines.find((p) => p.pipelineFile === pipelineFile);
    setPipeline(pipeline);
    const stageNames = _.map(pipeline.stages, 'name') as string[];
    setPipelineStages(stageNames);
    if (stageNames && stageNames.length == 1) {
      const stage = pipeline.stages[0];
      setIncludeStages(stageNames);
      setPipelineSteps(_.map(stage.steps, 'name') as string[]);
    }
  }, [pipelineFile]);

  const selectSecretFile = async () => {
    const result = await ddClient.desktopUI.dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      defaultPath: workspacePath,
      message: 'Select a secret file to use'
    });
    if (result.canceled) {
      return;
    }
    if (result.filePaths?.length > 0) {
      setSecretFile(result.filePaths[0]);
      return;
    }
  };

  const selectEnvFile = async () => {
    const result = await ddClient.desktopUI.dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      defaultPath: workspacePath,
      message: 'Select an environment file to use'
    });
    if (result.canceled) {
      return;
    }
    if (result.filePaths?.length > 0) {
      setEnvFile(result.filePaths[0]);
      return;
    }
  };

  const handleIncludeStages = (event: SelectChangeEvent<typeof includeStages>) => {
    const {
      target: { value }
    } = event;
    setIncludeStages(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value
    );
    //Clear existing steps
    setPipelineSteps([]);
    const steps = [];
    const tempStages = [].concat(value);
    tempStages.forEach((e) => {
      const stage = pipeline.stages.find((s) => s.name === e);
      if (stage) {
        steps.push(..._.map(stage.steps, 'name'));
        setPipelineSteps(steps);
      }
    });
  };

  const handleIncludeSteps = (event: SelectChangeEvent<typeof includeSteps>) => {
    const {
      target: { value }
    } = event;
    setIncludeSteps(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value
    );
  };

  const useDockerNetwork = (event: SelectChangeEvent) => {
    const net = event.target.value as string;
    setDockerNetwork(net);
  };

  const openHelp = (href: string) => {
    ddClient.host.openExternal(href);
  };

  const runPipeline = async () => {
    console.debug('Running pipeline ', pipelineFile);
    logHandler(undefined, true);

    const pipelineExecArgs = new Array<string>();

    //Add --pipeline flag
    if (includeStages && includeStages.length > 0) {
      console.debug('Adding Stage to run %s', includeStages[0]);
      pipelineExecArgs.push(`--pipeline=${includeStages[0]}`);
    }

    // Add --trusted arg
    if (trusted) {
      console.debug('Adding trusted');
      pipelineExecArgs.push(`--trusted`);
    }

    //Add --env-file arg
    if (envFile) {
      console.debug('Adding envfile');
      pipelineExecArgs.push(`--env-file=${envFile}`);
    }

    //Add --secret-file arg
    if (secretFile) {
      console.debug('Adding secretFile');
      pipelineExecArgs.push(`--secret-file=${secretFile}`);
    }

    //Add steps to include
    if (includeSteps && includeSteps?.length > 0) {
      console.debug('Adding includeSteps');
      const incSteps = includeSteps.map((s) => `--include="${s}"`);
      console.debug('Included Steps ', JSON.stringify(incSteps));
      pipelineExecArgs.push(...incSteps);
    }

    //Configure network
    if (dockerNetwork && dockerNetwork !== 'none') {
      console.debug('Adding Docker Network');
      pipelineExecArgs.push(`--network=${dockerNetwork}`);
    }

    //The pipeline file to use
    pipelineExecArgs.push(pipelineFile);

    console.debug('Pipeline Exec Args %s', JSON.stringify(pipelineExecArgs));

    // ddClient.extension.vm.cli.exec('ls', ['-ltr', '/data'], {
    //   stream: {
    //     onOutput(data) {
    //       console.log('ls %s', JSON.stringify(data));
    //     },
    //     onError(data) {
    //       console.log('ls error %s', JSON.stringify(data));
    //     }
    //   }
    // });

    const stageName = includeStages && includeStages.length > 0 ? includeStages[0] : undefined;

    try {
      let once = 0;
      ddClient.extension.host.cli.exec('run-drone', pipelineExecArgs, {
        stream: {
          onOutput() {
            if (once === 1) {
              const stage = stages.find((s) => s.name === stageName);
              //make it writable and set the status
              const runningStage = Object.assign({}, stage);
              //Reset step status
              let steps = runningStage.steps;
              for (let i = 0; i < steps.length; i++) {
                //make it writable and set the status
                const oldStep = steps[i];
                const toBeRunStep = Object.assign({}, oldStep);
                toBeRunStep.status = Status.NONE;
                console.debug('toBeRunStep %s', JSON.stringify(toBeRunStep));
                steps = [...steps.slice(0, i), toBeRunStep, ...steps.slice(i + 1)];
              }
              runningStage.steps = steps;
              console.debug('runningStage %s', JSON.stringify(runningStage));
              logHandler(
                {
                  stage: runningStage
                },
                true
              );
            }
            once++;
          },
          splitOutputLines: true
        }
      });
    } catch (err) {
      console.debug('Error %s', err);
    } finally {
      props.onClose();
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullWidth={true}
      maxWidth={'lg'}
    >
      <DialogTitle>Run Pipeline {pipelineFile}</DialogTitle>
      <DialogContent dividers={true}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            alignItems="baseline"
          >
            <FormControlLabel
              control={
                <Checkbox
                  onChange={() => {
                    setTrusted(!trusted);
                    return !trusted;
                  }}
                />
              }
              label="Trusted ?"
            />
            <IconButton
              aria-label="show help for include steps"
              onClick={() => openHelp('https://docs.drone.io/quickstart/cli/#trusted-mode')}
            >
              <InfoIcon />
            </IconButton>
          </Stack>
          <Stack
            direction="row"
            alignItems="baseline"
          >
            <InputLabel id="lbl-included-stages">Select stages to run</InputLabel>
            <IconButton
              aria-label="show help for include stages"
              onClick={() => openHelp('https://docs.drone.io/quickstart/cli/#run-specific-pipelines')}
            >
              <InfoIcon />
            </IconButton>
          </Stack>
          <FormControl sx={{ width: '100%' }}>
            <Select
              multiple={false}
              value={includeStages}
              placeholder="select stages to run"
              renderValue={(selected) => selected.join(', ')}
              onChange={handleIncludeStages}
              MenuProps={MenuProps}
            >
              {pipelineStages.map((s) => (
                <MenuItem
                  key={s}
                  value={s}
                >
                  <Checkbox checked={includeStages.indexOf(s) > -1} />
                  <ListItemText primary={s} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack
            direction="row"
            alignItems="baseline"
          >
            <InputLabel id="lbl-included-steps">Select steps to run</InputLabel>
            <IconButton
              aria-label="show help for include steps"
              onClick={() => openHelp('https://docs.drone.io/quickstart/cli/#run-specific-steps')}
            >
              <InfoIcon />
            </IconButton>
          </Stack>
          <FormControl sx={{ width: '100%' }}>
            <Select
              multiple
              value={includeSteps}
              placeholder="select steps to run"
              renderValue={(selected) => selected.join(', ')}
              onChange={handleIncludeSteps}
              MenuProps={MenuProps}
            >
              {pipelineSteps.map((step) => (
                <MenuItem
                  key={step}
                  value={step}
                >
                  <Checkbox checked={includeSteps.indexOf(step) > -1} />
                  <ListItemText primary={step} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack
            direction="row"
            alignItems="baseline"
          >
            <InputLabel id="lbl-secret-file">Any secret file to be used with the pipeline ?</InputLabel>
            <IconButton
              aria-label="show help with secret file"
              onClick={() => openHelp('https://docs.drone.io/quickstart/cli/#emulate-secrets')}
            >
              <InfoIcon />
            </IconButton>
          </Stack>
          <Paper
            component="form"
            sx={{ p: '6px 6px 6px 6px', display: 'flex', alignItems: 'left', width: '100%' }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="secret file name"
              inputProps={{ 'aria-label': 'secret file to use' }}
              value={secretFile}
            />
            <Tooltip title="clear">
              <IconButton
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={() => setSecretFile('')}
              >
                <BackspaceIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Find">
              <IconButton
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={selectSecretFile}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
          </Paper>
          <Stack
            direction="row"
            alignItems="baseline"
          >
            <InputLabel id="lbl-secret-file">Any environment file to be used with the pipeline ?</InputLabel>
            <IconButton
              aria-label="show help with environment file"
              onClick={() => openHelp('https://docs.drone.io/quickstart/cli/#usage')}
            >
              <InfoIcon />
            </IconButton>
          </Stack>
          <Paper
            component="form"
            sx={{ p: '6px 6px 6px 6px', display: 'flex', alignItems: 'left', width: '100%' }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="environment file name"
              inputProps={{ 'aria-label': 'secret file to use' }}
              value={envFile}
            />
            <Tooltip title="clear">
              <IconButton
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={() => setEnvFile('')}
              >
                <BackspaceIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Find">
              <IconButton
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={selectEnvFile}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
          </Paper>
          <InputLabel id="lbl-docker-network">Docker network</InputLabel>
          <FormControl sx={{ width: '100%' }}>
            <Select
              value={dockerNetwork}
              onChange={useDockerNetwork}
              placeholder="Select network to use"
              MenuProps={MenuProps}
            >
              {dockerNetworks.map((n) => (
                <MenuItem
                  key={n}
                  value={n}
                >
                  <ListItemText primary={n} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
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
          onClick={runPipeline}
        >
          Run
        </Button>
      </DialogActions>
    </Dialog>
  );
}
