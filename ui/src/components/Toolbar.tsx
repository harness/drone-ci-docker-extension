import { IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { alpha } from '@mui/material/styles';

export const PipelineTableToolbar = (props) => {
  const { numSelected, handleRemove } = props;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity)
        })
      }}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          &nbsp;
        </Typography>
      )}
      {numSelected > 0 ? (
        <Tooltip title="Remove Pipelines">
          <IconButton onClick={handleRemove}>
            <RemoveCircleIcon color="error" />
          </IconButton>
        </Tooltip>
      ) : (
        // TODO add filters
        <></>
      )}
    </Toolbar>
  );
};
