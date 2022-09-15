import React, { Fragment, useRef, useState, useEffect } from 'react';
import { createSearchParams, Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import { pipelineDisplayName, pipelinePath } from '../utils';
import { PipelineStatus } from './PipelineStatus';
import { PipelineRowActions } from './PipelineRowActions';
import { Link, Checkbox } from '@mui/material';

export const Pipeline = (props) => {
  const logRef: any = useRef();
  //!!!IMPORTANT - pass the location query params
  const [runViewURL, setRunViewURL] = useState({});

  const { labelId, pipelineFile, selected, onClick } = props;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const isItemSelected = isSelected(pipelineFile);

  const NavigateToRunView = React.forwardRef<any, Omit<RouterLinkProps, 'to'>>((props, ref) => (
    <RouterLink
      ref={ref}
      to={runViewURL}
      {...props}
    />
  ));

  useEffect(() => {
    const url = {
      pathname: '/run',
      search: `?${createSearchParams({
        file: pipelineFile
      })}`
    };
    setRunViewURL(url);
  }, [pipelineFile]);

  const logHandler = (data: any | undefined, clean?: boolean) => {
    console.debug('>> ', logRef.current);
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

  const PipelineTR = () => {
    return (
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
        <TableCell
          component="th"
          scope="row"
        >
          <Tooltip title={pipelineFile}>
            <Link component={NavigateToRunView}>{pipelineDisplayName(pipelineFile)}</Link>
          </Tooltip>
        </TableCell>

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
    );
  };

  const MemoizedPipelineTR = React.memo(PipelineTR);

  return (
    <Fragment>
      <MemoizedPipelineTR />
    </Fragment>
  );
};
