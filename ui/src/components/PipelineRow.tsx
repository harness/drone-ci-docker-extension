import IconButton from '@mui/material/IconButton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import { Fragment, useRef, useState } from 'react';
import { md5, pipelineDisplayName } from '../utils';
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

import { PipelineRowActions } from './PipelineRowActions';
import { Checkbox, TextareaAutosize } from '@mui/material';

export const Row = (props) => {
  const logRef: any = useRef();

  const { labelId, row, pipelineStatus, selected, onClick } = props;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const isItemSelected = isSelected(row.id);

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
