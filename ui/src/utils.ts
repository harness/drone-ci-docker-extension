import { createDockerDesktopClient } from '@docker/extension-api-client';
import { DockerDesktopClient } from '@docker/extension-api-client-types/dist/v1';
import { Md5 } from 'ts-md5/dist/md5';
import { PipelineStatus, Step } from './features/types';

let client: DockerDesktopClient;

export function getDockerDesktopClient() {
  if (!client) {
    client = createDockerDesktopClient();
  }
  return client;
}

export function pipelineFQN(pipelinePath: string, stageName: string): string {
  if (stageName.indexOf('/') != -1) {
    stageName = stageName.split('/')[1];
  }
  return `${pipelinePath.replaceAll('/', '-')}~~${stageName}`;
}

export function pipelineDisplayName(pipelineFile: string): string {
  const paths = pipelineFile.split('/');
  const pipelineDirLastPath = [paths[paths.length - 2]];
  const piplineFileLastPath = [paths[paths.length - 1]];
  return `${pipelineDirLastPath}/${piplineFileLastPath}`;
}

export function vscodeURI(pipelinePath: string): string {
  return `vscode://file${pipelinePath}?windowId=_blank`;
}

export function md5(str): string {
  return Md5.hashStr(str);
}

export async function getStepsCount(pipelinePath: string): Promise<number> {
  const out = await getDockerDesktopClient().extension.host.cli.exec('yq', ["'.steps|length'", pipelinePath]);
  if (out.stdout) {
    console.log(`Pipeline ${pipelinePath} has ${out.stdout} steps`);
    return parseInt(out.stdout);
  }
  return 0;
}

export function extractStepInfo(event: any, eventActorID: string, pipelineDir: string, status: string): Step {
  const stageName = event.Actor.Attributes['io.drone.stage.name'];
  return {
    stepContainerId: eventActorID,
    pipelineFQN: pipelineFQN(pipelineDir, stageName),
    name: event.Actor.Attributes['io.drone.step.name'],
    image: event.Actor.Attributes['image'],
    status: status
  };
}
