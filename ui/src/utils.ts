import { createDockerDesktopClient } from '@docker/extension-api-client';
import { DockerDesktopClient } from '@docker/extension-api-client-types/dist/v1';
import { Md5 } from 'ts-md5/dist/md5';
import { Step } from './features/types';

let client: DockerDesktopClient;

export function getDockerDesktopClient() {
  if (!client) {
    client = createDockerDesktopClient();
  }
  return client;
}

export function pipelineFQN(pipelinePath: string, pipelineName: string): string {
  if (pipelineName.indexOf('/') != -1) {
    pipelineName = pipelineName.split('/')[1];
  }
  return `${pipelinePath.replaceAll('/', '-')}~~${pipelineName}`;
}

export function pipelineDisplayName(pipelinePath: string, pipelineName: string): string {
  const paths = pipelinePath.split('/');
  return `${paths[paths.length - 1]}/${pipelineName}`;
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
  const pipelineName = event.Actor.Attributes['io.drone.stage.name'];
  return {
    stepContainerId: eventActorID,
    pipelineFQN: pipelineFQN(pipelineDir, pipelineName),
    stepName: event.Actor.Attributes['io.drone.step.name'],
    stepImage: event.Actor.Attributes['image'],
    status: status
  };
}
