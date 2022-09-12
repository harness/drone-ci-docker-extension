import PendingIcon from '@mui/icons-material/Pending';
import { Typography } from '@mui/material';
import { Status } from '../features/types';
import RunCircleIcon from '@mui/icons-material/RunCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
export const StepStatus = (props: { status: Status }) => {
  const { status } = props;

  switch (status) {
    case Status.RUNNING:
      return <RunCircleIcon color="warning" />;
    case Status.ERROR:
      return <ErrorIcon color="error" />;
    case Status.SUCCESS:
      return <CheckCircleIcon color="success" />;
    default:
      return <PendingIcon color="action">None</PendingIcon>;
  }
};
