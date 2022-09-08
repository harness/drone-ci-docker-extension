import { useState } from 'react';
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
import { Stage } from './Stage';
import { dataLoadStatus, removeStages, selectRows } from '../features/pipelinesSlice';
import { PipelineTableToolbar } from './Toolbar';
import { PipelinesTableHead } from './PipelinesTableHead';
import RemovePipelineDialog from './dialogs/RemoveStageDialog';

import { useAppDispatch } from '../app/hooks';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const StageTable = () => {
  const dispatch = useAppDispatch();
  const pipelinesStatus = useSelector(dataLoadStatus);
  const pipelines = useSelector(selectRows);

  const [selected, setSelected] = useState<readonly string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dense, setDense] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removals, setRemovals] = useState([]);

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
      dispatch(removeStages(removals));
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
                {pipelines.map((row) => {
                  return (
                    <Stage
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
          rowsPerPageOptions={[5, 10, 15, 25]}
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
