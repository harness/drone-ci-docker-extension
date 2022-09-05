import { Fragment } from 'react';

import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { Step } from '../features/types';
import { StepStatus } from './StepStatus';

export const PipelineStep = (props: { step: Step }) => {
  const { step } = props;
  //console.log('Adding Steps ' + JSON.stringify(step));

  return (
    <Fragment>
      <TableRow
        key={step.stepContainerId}
        sx={{ '& > *': { borderTop: 'unset', borderBottom: 'unset' } }}
      >
        <TableCell>{step.name}</TableCell>
        <TableCell>{step.image} </TableCell>
        <TableCell>
          <StepStatus status={step.status} />
        </TableCell>
      </TableRow>
    </Fragment>
  );
};
