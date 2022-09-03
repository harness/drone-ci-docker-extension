import PendingIcon from '@mui/icons-material/Pending';
import { Typography } from '@mui/material';
export const StepStatus = (props: { status: string }) => {
  const { status } = props;

  switch (status) {
    case 'start':
      return (
        <Typography
          variant="button"
          display="block"
          gutterBottom
          color="green"
        >
          Running
        </Typography>
      );
    case 'error':
      return (
        <Typography
          variant="button"
          display="block"
          gutterBottom
          color="red"
        >
          Error
        </Typography>
      );
    case 'done':
      return (
        <Typography
          variant="button"
          display="block"
          fontSize="small"
          gutterBottom
          color="green"
        >
          Success
        </Typography>
      );
    default:
      return <PendingIcon color="action">Done</PendingIcon>;
  }
};
