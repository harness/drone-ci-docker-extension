import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../app/hooks';
import { updateStepCount } from '../features/pipelinesSlice';
import { getDockerDesktopClient } from '../utils';

export const PipelineStatus = (props) => {
  const dispatch = useAppDispatch();
  const { status, pipelineID, pipelineFile } = props;
  const [statusColor, setStatusColor] = useState('info');
  const [statusText, setStatusText] = useState('');
  //console.log('Pipeline Status' + JSON.stringify(status));

  useEffect(() => {
    const countSteps = async () => {
      const out = await getDockerDesktopClient().extension.host.cli.exec('yq', ["'.steps|length'", pipelineFile]);
      //console.log('Pipeline ' + pipelineFile + ' has ' + out.stdout + ' steps');
      if (out && out.stdout) {
        dispatch(updateStepCount({ pipelineID, status: { total: parseInt(out.stdout) } }));
      }
    };
    countSteps();
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
