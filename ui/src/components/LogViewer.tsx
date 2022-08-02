import { TableRow, TextField } from '@mui/material';
import { useState } from 'react';
import { getDockerDesktopClient } from '../utils';
export const LogViewer = (props) => {
  const step = props.step;
  const [logs, setLogs] = useState('');
  const ddClient = getDockerDesktopClient();

  console.log('Step Status ' + step.status);

  const showLogs = () => {
    console.log('Handle Step Logs for step %', JSON.stringify(step));
    const process = ddClient.docker.cli.exec('logs', ['--details', '--follow', step.stepContainerId], {
      stream: {
        splitOutputLines: true,
        onOutput(data) {
          setLogs(logs + data.stdout);
        },
        onError(error) {
          setLogs(logs + error);
        },
        onClose(exitCode) {
          console.log('onClose with exit code ' + exitCode);
        }
      }
    });

    return () => {
      process.close();
    };
  };

  return (
    <TableRow
      key={step.stepContainerId}
      sx={{ '& > *': { borderTop: 'unset', borderBottom: 'unset' } }}
    >
      {step.stepContainerId && showLogs}
      <TextField
        multiline
        fullWidth
      >
        {logs}
      </TextField>
    </TableRow>
  );
};
