import { Fragment } from 'react';

import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { Step } from '../features/types';
import { StepStatus } from './StepStatus';

export const PipelineStep = (props: { row: Step }) => {
  const { row } = props;
  //console.log('Adding Steps ' + JSON.stringify(row));

  return (
    <Fragment>
      <TableRow
        key={row.stepContainerId}
        sx={{ '& > *': { borderTop: 'unset', borderBottom: 'unset' } }}
      >
        <TableCell>{row.stepName}</TableCell>
        <TableCell>{row.stepImage} </TableCell>
        <TableCell>
          <StepStatus status={row.status} />
        </TableCell>
      </TableRow>
    </Fragment>
  );
};
