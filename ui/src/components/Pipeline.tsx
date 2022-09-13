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

export const Pipeline = (props) => {
  const logRef: any = useRef();
  //!!!IMPORTANT - pass the location query params
  const loc = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [runViewURL, setRunViewURL] = useState('');

  const { labelId, pipelineFile, selected, onClick } = props;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const isItemSelected = isSelected(pipelineFile);

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
