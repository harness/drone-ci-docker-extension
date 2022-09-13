import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { vscodeURI } from '../utils';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import RemovePipelineDialog from './dialogs/RemovePipelineDialog';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';

export const PipelineRowActions = (props: { workspacePath: string; pipelineFile: string; logHandler; openHandler }) => {
  const navigate = useNavigate();
  const loc = useLocation();
  const { pipelineFile, workspacePath, logHandler, openHandler } = props;
  const [removeConfirm, setRemoveConfirm] = useState(false);

  /* Handlers */
  const handleDeletePipelines = () => {
    setRemoveConfirm(true);
  };

  const handleRemoveDialogClose = () => {
    setRemoveConfirm(false);
  };

  const navigateToView = () => {
    const url = encodeURI(`run/${loc.search}&file=${pipelineFile}&runPipeline=true`);
    console.log('Pipeline Row Actions %s', url);
    navigate(url, { replace: true });
  };

  return (
    <Stack
      direction="row"
      spacing={2}
    >
      <Tooltip title="Run Pipeline">
        <IconButton onClick={navigateToView}>
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
