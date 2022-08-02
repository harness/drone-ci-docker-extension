import { Fragment } from 'react';

import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import ArticleIcon from '@mui/icons-material/Article';

import { Step } from '../features/types';
import { StepStatus } from './StepStatus';
import { Tooltip } from '@mui/material';

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
        <TableCell>
          {row.status !== 'destroy' && (
            <Tooltip title="Show Step Logs">
              <IconButton
                color="primary"
                hidden={row.status !== 'destroy'}
              >
                <ArticleIcon />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    </Fragment>
  );
};
