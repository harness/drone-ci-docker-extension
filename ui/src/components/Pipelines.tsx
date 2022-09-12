import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Backdrop, CircularProgress, Paper, Table, TableBody, TableContainer } from '@mui/material';
import { Pipeline as Row } from './Pipeline';
import { dataLoadStatus, selectPipelines, removeStages } from '../features/pipelinesSlice';
import { PipelineTableToolbar } from './Toolbar';
import { PipelinesTableHead } from './PipelinesTableHead';
import RemovePipelineDialog from './dialogs/RemovePipelineDialog';

import { useAppDispatch } from '../app/hooks';
import * as _ from 'lodash';
import React from 'react';
import { Pipeline } from '../features/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Pipelines = () => {
  const dispatch = useAppDispatch();
  const pipelinesStatus = useSelector(dataLoadStatus);
  const pipelines = useSelector(selectPipelines);

  const [selected, setSelected] = useState<readonly string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dense, setDense] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removals, setRemovals] = useState([]);

  /* Handlers */

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = pipelines?.map((n) => n.pipelineFile);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
    if (pipelines.length > 0) {
      dispatch(removeStages(removals));
    }
    setSelected([]);
    setRemovals([]);
  };

  const removeSelectedPipelines = () => {
    const toRemove = [];
    toRemove.push(...selected);
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

  const PipelineRow = ({ pipelineFile }) => {
    return (
      <Row
        labelId={pipelineFile}
        pipelineFile={pipelineFile}
        selected={selected}
        onClick={handleClick}
      />
    );
  };
  const MemoizedPipelineRow = React.memo(PipelineRow);

  const PipelineRows = pipelines.map((row) => {
    const id = _.sumBy(row.stages, 'id');
    // console.log('Row  ID %s : %s', id, row.pipelineFile);
    return (
      <MemoizedPipelineRow
        key={id}
        pipelineFile={row.pipelineFile}
      />
    );
  });

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
            aria-labelledby="Stage List"
            size={dense ? 'small' : 'medium'}
          >
            <PipelinesTableHead
              numSelected={selected?.length}
              rowCount={pipelines?.length}
              onSelectAllClick={handleSelectAll}
            />
            {pipelinesStatus === 'loaded' && <TableBody>{PipelineRows}</TableBody>}
          </Table>
        </TableContainer>
        <RemovePipelineDialog
          open={removals.length > 0}
          selectedToRemove={removals}
          onClose={handleRemoveDialogClose}
        />
      </Paper>
    </>
  );
};
