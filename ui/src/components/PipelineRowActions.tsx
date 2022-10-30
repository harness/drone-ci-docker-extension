import React, { useEffect } from 'react';
import { useState } from 'react';
import { createSearchParams, Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { md5, vscodeURI } from '../utils';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import RemovePipelineDialog from './dialogs/RemovePipelineDialog';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import StopPipelineDialog from './dialogs/StopPipelineDialog';
import { useSelector } from 'react-redux/es/hooks/useSelector';
import { RootState } from '../app/store';
import { selectPipelineStatus } from '../features/pipelinesSlice';

export const PipelineRowActions = (props: { workspacePath: string; pipelineFile: string; logHandler; openHandler }) => {
  //!!!IMPORTANT - pass the location query params
  const [runViewURL, setRunViewURL] = useState({});
  const { pipelineFile, workspacePath } = props;
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);

  const pipelineStatus = useSelector((state: RootState) => selectPipelineStatus(state, pipelineFile));

  /* Handlers */
  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
  };

  const handleStopPipeline = () => {
    setStopConfirm(true);
  };

  const handleStopPipelineDialogClose = () => {
    setStopConfirm(false);
  };


  useEffect(() => {
    const url = {
      pathname: '/run',
      search: `?${createSearchParams({
        file: pipelineFile,
        runPipeline: 'true'
      })}`
    };
    setRunViewURL(url);
  }, [pipelineFile]);

  const NavigateToRunView = React.forwardRef<any, Omit<RouterLinkProps, 'to'>>((props, ref) => (
    <RouterLink
      ref={ref}
      to={runViewURL}
      {...props}
      role={undefined}
    />
  ));

  return (
    <Stack
      direction="row"
      spacing={2}
    >
      <Tooltip title="Run Pipeline">
        <IconButton component={NavigateToRunView}>
          <PlayCircleFilledWhiteIcon color="info" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Open in VS Code">
        <IconButton
          aria-label="edit in vscode"
          color="primary"
          href={vscodeURI(workspacePath)}
        >
          <img
            src={process.env.PUBLIC_URL + '/images/vscode.png'}
            width="16"
          />
        </IconButton>
      </Tooltip>
      <Tooltip title="Stop Pipeline">
        <span>
          <IconButton 
            onClick={handleStopPipeline}
            color="primary"
            disabled={pipelineStatus != 2}>
            <StopCircleIcon />
          </IconButton>
        </span>
      </Tooltip>
      {stopConfirm && (
        <StopPipelineDialog
          open={stopConfirm}
          pipelineFile={pipelineFile}
          onClose={handleStopPipelineDialogClose}
        />
      )}
      <Tooltip title="Remove Pipeline">
        <IconButton onClick={handleDeletePipelines}>
          <DeleteIcon color="error" />
        </IconButton>
      </Tooltip>
      {removeConfirm && (
        <RemovePipelineDialog
          open={removeConfirm}
          selectedToRemove={[pipelineFile]}
          onClose={handleRemoveDialogClose}
        />
      )}
    </Stack>
  );
};
