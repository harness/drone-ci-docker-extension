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
import { getDockerDesktopClient, md5, pipelineFQN as getPipelineFQN } from '../utils';
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
    }
    const loadEventTS = async () => {
      const out = await getDockerDesktopClient().extension.vm.cli.exec('sh', ['-c', '"cat /data/currts"']);
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

          //console.log('Actor %s', JSON.stringify(event.Actor));
          const stepContainerId = event.Actor['ID'];
          const pipelineDir = event.Actor.Attributes['io.drone.desktop.pipeline.dir'];
          const pipelineID = md5(pipelineDir);
          const pipelineName = event.Actor.Attributes['io.drone.stage.name'];
          const pipelineFQN = getPipelineFQN(pipelineDir, pipelineName);
          const stepName = event.Actor.Attributes['io.drone.step.name'];
          const stepImage = event.Actor.Attributes['image'];
          switch (event.status) {
            case EventStatus.START: {
              if (pipelineFQN && stepName) {
                const stepInfo: Step = {
                  stepContainerId,
                  pipelineFQN,
                  stepName,
                  stepImage,
                  status: 'start'
                };
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
              //console.log('STOP/DIE/KILL %s', JSON.stringify(event));
              const exitCode = parseInt(event.Actor.Attributes['exitCode']);
              if (pipelineFQN && stepName) {
                const stepInfo: Step = {
                  stepContainerId,
                  pipelineFQN,
                  stepName,
                  stepImage,
                  status: exitCode === 0 ? 'done' : 'error'
                };
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
        await getDockerDesktopClient().extension.vm.cli.exec('sh', ['-c', '"date +%s > /data/currts"']);
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
          numSelected={selected.length}
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="Pipleines List"
            size={dense ? 'small' : 'medium'}
          >
            <PipelinesTableHead
              numSelected={selected.length}
              rowCount={pipelines.length}
              onSelectAllClick={handleSelectAll}
            />
            {pipelinesStatus === 'loaded' && (
              <TableBody>
                {pipelines.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
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
