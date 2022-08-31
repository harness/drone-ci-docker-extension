import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Backdrop,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow
} from '@mui/material';
import { Row } from './PipelineRow';
import {
  dataLoadStatus,
  importPipelines,
  removePipelines,
  selectRows,
  updateStep,
  addStep,
  savePipelines
} from '../features/pipelinesSlice';
import { useAppDispatch } from '../app/hooks';
import { extractStepInfo, getDockerDesktopClient, md5 } from '../utils';
import { Event, EventStatus, Step } from '../features/types';
import { PipelineTableToolbar } from './Toolbar';
import { PipelinesTableHead } from './PipelinesTableHead';
import RemovePipelineDialog from './RemovePipelineDialog';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PipelinesTable = (props) => {
  const dispatch = useAppDispatch();
  const pipelinesStatus = useSelector(dataLoadStatus);
  const pipelines = useSelector(selectRows);

  const [selected, setSelected] = useState<readonly string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dense, setDense] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removals, setRemovals] = useState([]);

  const ddClient = getDockerDesktopClient();

  const [eventTS, setEventTS] = useState('');

  useEffect(() => {
    if (pipelinesStatus === 'idle') {
      dispatch(importPipelines());
      return;
    }
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
  }, [pipelinesStatus, dispatch]);

  useEffect(() => {
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

    if (eventTS) {
      args.push('--since', eventTS.trimEnd());
    }

    const process = ddClient.docker.cli.exec('events', args, {
      stream: {
        splitOutputLines: true,
        async onOutput(data) {
          const event = JSON.parse(data.stdout ?? data.stderr) as Event;
          if (!event) {
            return;
          }

          //console.log('Event %s', JSON.stringify(event));
          const eventActorID = event.Actor['ID'];
          const pipelineDir = event.Actor.Attributes['io.drone.desktop.pipeline.dir'];
          switch (event.status) {
            case EventStatus.PULL: {
              //TODO update the status with image pull
              console.log('Pulling Image %s', eventActorID);
              break;
            }
            case EventStatus.START: {
              const pipelineID = md5(pipelineDir);
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, 'start');
              if (stepInfo.pipelineFQN && stepInfo.stepName) {
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
              const pipelineID = md5(pipelineDir);
              const stepInfo = extractStepInfo(event, eventActorID, pipelineDir, 'dummy');
              //console.log('STOP/DIE/KILL %s', JSON.stringify(event));
              const exitCode = parseInt(event.Actor.Attributes['exitCode']);
              if (stepInfo.pipelineFQN && stepInfo.stepName) {
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

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - pipelines?.length) : 0;

  /* Handlers */

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = pipelines?.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
    //console.log('Pipe L ' + pipelines.length);
    if (pipelines.length > 0) {
      dispatch(removePipelines(removals));
    }
    setSelected([]);
    setRemovals([]);
  };

  const removeSelectedPipelines = () => {
    const toRemove = [];
    toRemove.push(...selected);
    //console.log('Remove all: ' + toRemove);
    setRemovals(toRemove);
  };

  const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }

    setSelected(newSelected);
  };

  /* End of Handlers */
  return (
    <>
      <Backdrop
        sx={{
          backgroundColor: 'rgba(245,244,244,0.4)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
        open={pipelinesStatus === 'loading'}
      >
        <CircularProgress color="info" />
      </Backdrop>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <PipelineTableToolbar
          handleRemove={removeSelectedPipelines}
          numSelected={selected?.length}
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="Pipleines List"
            size={dense ? 'small' : 'medium'}
          >
            <PipelinesTableHead
              numSelected={selected?.length}
              rowCount={pipelines?.length}
              onSelectAllClick={handleSelectAll}
            />

            {pipelinesStatus === 'loaded' && (
              <TableBody>
                {(pipelines.length > rowsPerPage
                  ? pipelines.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  : pipelines
                ).map((row) => {
                  //console.log('Row Key:' + row.id + ' ' + row.pipelineFile);
                  return (
                    <Row
                      key={row.id}
                      row={row}
                      selected={selected}
                      pipelineStatus={row.status}
                      onClick={handleClick}
                    />
                  );
                })}
                {emptyRows > 0 && (
                  <TableRow
                    style={{
                      height: (dense ? 33 : 53) * emptyRows
                    }}
                  >
                    <TableCell colSpan={4} />
                  </TableRow>
                )}
              </TableBody>
            )}
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pipelines.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        <RemovePipelineDialog
          open={removals.length > 0}
          selectedToRemove={removals}
          onClose={handleRemoveDialogClose}
        />
      </Paper>
    </>
  );
};
