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

  useEffect(() => {
    dispatch(
      updateStepCount({
        pipelineID,
        status: {
          done: status.done,
          error: status.error,
          running: status.running,
          total: stepsCount
        }
      })
    );
  }, []);

  useEffect(() => {
    if (status?.running > 0 && status?.running != status?.done) {
      setStatusColor('warning');
      setStatusText(`${status.running}/${status.total}(running)`);
    } else if (status?.error > 0) {
      setStatusColor('error');
      setStatusText(`${status.error}/${status.total}(errored)`);
    } else if (status?.done == status.total) {
      setStatusColor('success');
      setStatusText(`${status.done}/${status.total}(completed)`);
    } else {
      setStatusColor('primary');
      setStatusText(`0/${status?.total}`);
    }
  }, [status]);

  return (
    <Typography
      variant="body1"
      color={statusColor}
    >
      {statusText}
    </Typography>
  );
};
