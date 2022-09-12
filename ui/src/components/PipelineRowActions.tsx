import { IconButton, Stack, Tooltip } from '@mui/material';
import { vscodeURI } from '../utils';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { useState } from 'react';
import RemovePipelineDialog from './dialogs/RemovePipelineDialog';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import RunPipelineDialog from './dialogs/RunPipelineDialog';

export const PipelineRowActions = (props: { workspacePath: string; pipelineFile: string; logHandler; openHandler }) => {
  const { pipelineFile, workspacePath, logHandler, openHandler } = props;
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [openRunPipeline, setOpenRunPipeline] = useState(false);

  /* Handlers */
  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
  };

  const handleRunPipeline = () => {
    setOpenRunPipeline(true);
  };

  const handleRunPipelineDialogClose = () => {
    setOpenRunPipeline(false);
  };

  return (
    <Stack
      direction="row"
      spacing={2}
    >
      <Tooltip title="Run Pipeline">
        <IconButton onClick={handleRunPipeline}>
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

      {openRunPipeline && (
        <RunPipelineDialog
          open={openRunPipeline}
          onClose={handleRunPipelineDialogClose}
          pipelineFile={pipelineFile}
          workspacePath={workspacePath}
          logHandler={logHandler}
          openHandler={openHandler}
        />
      )}
    </Stack>
  );
};
