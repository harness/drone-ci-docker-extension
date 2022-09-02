import { Fragment, useRef, useState, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import { md5, pipelineDisplayName, getDockerDesktopClient, extractStepInfo } from '../utils';
import PlusIcon from '@mui/icons-material/Add';
import MinusIcon from '@mui/icons-material/Remove';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import { PipelineStep } from './PipelineStep';
import { PipelineStatus } from './PipelineStatus';
import { useAppDispatch } from '../app/hooks';
import { PipelineRowActions } from './PipelineRowActions';
import { Checkbox, TextareaAutosize } from '@mui/material';
import { Event, EventStatus } from '../features/types';
import { updateStep, addStep, savePipelines } from '../features/pipelinesSlice';

export const Row = (props) => {
  const logRef: any = useRef();
  const dispatch = useAppDispatch();
  const [eventTS, setEventTS] = useState('');

  const { labelId, row, pipelineStatus, selected, onClick } = props;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const isItemSelected = isSelected(row.id);

  const ddClient = getDockerDesktopClient();

  const logHandler = (data: any | undefined, clean?: boolean) => {
    //console.log('>> ', logRef.current);
    const logEl = logRef.current;
    if (logEl) {
      if (clean) {
        setLogs('');
        return true;
      }
      const out = data.stdout;
      const err = data.stderr;
      if (out) {
        setLogs((oldLog) => oldLog + `\n${out}`);
      } else if (err) {
        setLogs((oldLog) => oldLog + `\n${err}`);
      }
    }
  };

  useEffect(() => {
    const loadEventTS = async () => {
      const out = await getDockerDesktopClient().extension.vm.cli.exec('bash', [
        '-c',
        "'[ -f /data/currts ] && cat /data/currts || date +%s > /data/currts'"
      ]);
      if (out.stdout) {
        setEventTS(out.stdout);
      }
    };
    loadEventTS().catch(console.error);

    const args = [
      '--filter',
      'type=container',
      '--filter',
      'event=start',
      '--filter',
      'event=stop',
      '--filter',
      'event=kill',
      '--filter',
      'event=die',
      '--filter',
      'event=destroy',
      '--filter',
      'type=image',
      '--filter',
      'event=pull',
      '--format',
      '{{json .}}'
    ];

    if (props.eventTS) {
      args.push('--since', props.eventTS.trimEnd());
    }

    const process = ddClient.docker.cli.exec('events', args, {
      stream: {
        splitOutputLines: true,
        async onOutput(data) {
          const event = JSON.parse(data.stdout ?? data.stderr) as Event;
          if (!event) {
            return;
          }
          //console.log('Running Pipeline %s', row.pipelineFile);
          //console.log('Event %s', JSON.stringify(event));
          const eventActorID = event.Actor['ID'];
          const stageName = event.Actor.Attributes['io.drone.stage.name'];
          const pipelineDir = event.Actor.Attributes['io.drone.desktop.pipeline.dir'];
          switch (event.status) {
            case EventStatus.PULL: {
              //TODO update the status with image pull
              console.log('Pulling Image %s', eventActorID);
              break;
            }
            case EventStatus.START: {
              const pipelineID = md5(`${stageName}|${row.pipelineFile}`);
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, 'start');
              if (stageName) {
                dispatch(
                  addStep({
                    pipelineID,
                    step: stepInfo
                  })
                );
              }
              break;
            }

            case EventStatus.STOP:
            case EventStatus.DIE:
            case EventStatus.KILL: {
              const pipelineID = md5(`${stageName}|${row.pipelineFile}`);
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, 'dummy');
              //console.log('STOP/DIE/KILL %s', JSON.stringify(event));
              const exitCode = parseInt(event.Actor.Attributes['exitCode']);
              if (stageName) {
                if (exitCode === 0) {
                  stepInfo.status = 'done';
                } else {
                  stepInfo.status = 'error';
                }
                dispatch(
                  updateStep({
                    pipelineID,
                    step: stepInfo
                  })
                );
                dispatch(savePipelines());
              }
              break;
            }
            default: {
              //not handled EventStatus.DESTROY
              break;
            }
          }
        }
      }
    });

    return () => {
      process.close();
      //Write the current tstamp to a file so that we can track the events later
      const writeCurrTstamp = async () => {
        await getDockerDesktopClient().extension.vm.cli.exec('bash', ['-c', '"date +%s > /data/currts"']);
      };
      writeCurrTstamp();
    };
  }, [eventTS]);

  return (
    <Fragment>
      <TableRow sx={{ '& > *': { borderTop: 'unset', borderBottom: 'unset' } }}>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            checked={isItemSelected}
            inputProps={{
              'aria-labelledby': labelId
            }}
            onClick={(event) => onClick(event, row.id)}
            role="checkbox"
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <MinusIcon /> : <PlusIcon />}
          </IconButton>
        </TableCell>
        <Tooltip title={row.pipelineFile}>
          <TableCell
            component="th"
            scope="row"
          >
            {pipelineDisplayName(row.pipelinePath, row.stageName)}
          </TableCell>
        </Tooltip>
        <TableCell
          component="th"
          scope="row"
        >
          <PipelineStatus
            pipelineID={row.id}
            stepsCount={row.steps?.length}
            status={pipelineStatus}
            pipelineFile={row.pipelineFile}
          />
        </TableCell>
        <TableCell>
          <PipelineRowActions
            pipelineID={row.id}
            pipelineFile={row.pipelineFile}
            stageName={row.stageName}
            workspacePath={row.pipelinePath}
            logHandler={logHandler}
            openHandler={setOpen}
          />
        </TableCell>
      </TableRow>
      {row.steps && (
        <TableRow sx={{ '& > *': { borderTop: 'unset', borderBottom: 'unset' } }}>
          <TableCell
            style={{ paddingBottom: 0, paddingTop: 0 }}
            colSpan={6}
          >
            <Collapse
              in={open}
              timeout="auto"
              unmountOnExit
            >
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  component="div"
                >
                  Steps
                </Typography>
                <Table
                  size="small"
                  aria-label="steps"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Container</TableCell>
                      <TableCell>Status</TableCell>
                      {/* <TableCell>Actions</TableCell> */}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.steps &&
                      row.steps.map((step) => (
                        <>
                          <PipelineStep
                            key={`${row.id}-${md5(step.name)}`}
                            row={step}
                          />
                        </>
                      ))}
                  </TableBody>
                </Table>
              </Box>
              <Box>
                <TextareaAutosize
                  id={`pipeline-run-${row.id}`}
                  readOnly={true}
                  style={{ width: '100%' }}
                  minRows={10}
                  ref={logRef}
                  autoFocus={true}
                  value={logs}
                />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
};
