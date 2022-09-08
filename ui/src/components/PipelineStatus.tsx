import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../app/hooks';
import { updateStepCount } from '../features/pipelinesSlice';

export const PipelineStatus = (props) => {
  const dispatch = useAppDispatch();
  const { status, pipelineID, stepsCount } = props;
  const [statusColor, setStatusColor] = useState('info');
  const [statusText, setStatusText] = useState('');
  //console.log('Pipeline Status' + JSON.stringify(status));

  // useEffect(() => {
  //   dispatch(
  //     updateStepCount({
  //       pipelineID,
  //       status: {
  //         done: status.done,
  //         error: status.error,
  //         running: status.running,
  //         total: stepsCount
  //       }
  //     })
  //   );
  // }, []);

  useEffect(() => {
    switch (status) {
      case 1:
        setStatusColor('success');
        setStatusText('success');
        break;
      case 2:
        setStatusColor('error');
        setStatusText('failed');
        break;

      default:
        setStatusColor('primary');
        setStatusText('none');
        break;
    }
  }, [status]);

  return (
    <Typography
      variant="caption"
      color={statusColor}
      fontSize="small"
      fontWeight="bold"
    >
      {statusText}
    </Typography>
  );
};
