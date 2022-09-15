import React, { useEffect } from 'react';
import { useState } from 'react';
import { createSearchParams, Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { Button, IconButton, Link, Stack, Tooltip } from '@mui/material';
import { vscodeURI } from '../utils';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import RemovePipelineDialog from './dialogs/RemovePipelineDialog';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';

export const PipelineRowActions = (props: { workspacePath: string; pipelineFile: string; logHandler; openHandler }) => {
  //!!!IMPORTANT - pass the location query params
  const [runViewURL, setRunViewURL] = useState({});
  const { pipelineFile, workspacePath } = props;
  const [removeConfirm, setRemoveConfirm] = useState(false);

  /* Handlers */
  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
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
      <Tooltip title="Remove Pipeline">
        <IconButton onClick={handleDeletePipelines}>
          <RemoveCircleIcon color="error" />
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
