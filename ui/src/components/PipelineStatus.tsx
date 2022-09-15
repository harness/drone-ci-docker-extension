import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { selectPipelineStatus } from '../features/pipelinesSlice';

export const PipelineStatus = (props) => {
  const { pipelineFile } = props;
  const pipelineStatus = useSelector((state: RootState) => selectPipelineStatus(state, pipelineFile));
  const [statusColor, setStatusColor] = useState('info');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    //console.debug('pipelineFile %s Status %s', pipelineFile, pipelineStatus);

    switch (pipelineStatus) {
      case 1:
        setStatusColor('green');
        setStatusText('success');
        break;
      case 2:
        setStatusColor('blue');
        setStatusText('running');
        break;
      case 3:
        setStatusColor('red');
        setStatusText('error');
        break;
      default:
        setStatusColor('primary');
        setStatusText('none');
        break;
    }
  }, []);

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
