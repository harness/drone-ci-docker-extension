import React, { Fragment, useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import { md5, pipelineDisplayName, getDockerDesktopClient, extractStepInfo, pipelinePath } from '../utils';
import { PipelineStatus } from './PipelineStatus';
import { useAppDispatch } from '../app/hooks';
import { PipelineRowActions } from './PipelineRowActions';
import { Checkbox, Link } from '@mui/material';
import { Event, EventStatus, Status } from '../features/types';
import { updateStep, persistPipeline } from '../features/pipelinesSlice';

export const Pipeline = (props) => {
  const logRef: any = useRef();
  //!!!IMPORTANT - pass the location query params
  const loc = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [eventTS, setEventTS] = useState('');
  const [runViewURL, setRunViewURL] = useState('');

  const { labelId, pipelineFile, selected, onClick } = props;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const isItemSelected = isSelected(pipelineFile);

  const ddClient = getDockerDesktopClient();

  useEffect(() => {
    setRunViewURL(encodeURI(`run/${loc.search}&file=${pipelineFile}`));
  }, [pipelineFile]);

  const navigateToView = () => {
    navigate(runViewURL, { replace: true });
  };

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
          console.log('Running Pipeline %s', pipelineFile);
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
              const pipelineID = pipelineFile;
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, Status.RUNNING);
              if (stageName) {
                dispatch(
                  updateStep({
                    pipelineID,
                    stageName: stageName,
                    step: stepInfo
                  })
                );
              }
              break;
            }

            case EventStatus.STOP:
            case EventStatus.DIE:
            case EventStatus.DESTROY: {
              const pipelineID = pipelineFile;
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, Status.NONE);
              //console.log('STOP/DIE/KILL %s', JSON.stringify(event));
              const exitCode = parseInt(event.Actor.Attributes['exitCode']);
              if (stageName) {
                if (exitCode === 0) {
                  stepInfo.status = Status.SUCCESS;
                } else {
                  stepInfo.status = Status.ERROR | Status.FAILED;
                }
                dispatch(
                  updateStep({
                    pipelineID,
                    stageName: stageName,
                    step: stepInfo
                  })
                );
                dispatch(persistPipeline(pipelineID));
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
  }, [pipelineFile]);

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
            onClick={(event) => onClick(event, pipelineFile)}
            role="checkbox"
          />
        </TableCell>
        <Tooltip title={pipelineFile}>
          <TableCell
            component="th"
            scope="row"
          >
            <Link
              href="#"
              onClick={() => navigateToView()}
            >
              {pipelineDisplayName(pipelineFile)}
            </Link>
          </TableCell>
        </Tooltip>

        <TableCell
          component="th"
          scope="row"
        >
          <PipelineStatus pipelineFile={pipelineFile} />
        </TableCell>
        <TableCell>
          <PipelineRowActions
            pipelineFile={pipelineFile}
            workspacePath={pipelinePath(pipelineFile)}
            logHandler={logHandler}
            openHandler={setOpen}
          />
        </TableCell>
      </TableRow>
    </Fragment>
  );
};
