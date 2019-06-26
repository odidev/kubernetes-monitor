import * as plugin from 'snyk-docker-plugin';
import config = require('../../common/config');
import { IDepGraphPayload, IKubeImage } from '../../transmitter/types';

export interface ScanResult {
  image: string;
  pluginResult: any;
}

export async function scanImages(images: string[]): Promise<ScanResult[]> {
  const scannedImages: ScanResult[] = [];

  for (const image of images) {
    try {
      const result = await plugin.inspect(image);
      if (!result || !result.package || !result.package.dependencies) {
        throw Error('Unexpected empty result from docker-plugin');
      }
      scannedImages.push({
        image,
        pluginResult: result,
      });
    } catch (error) {
      console.log(`Could not scan the image ${image}: ${error.message}`);
    }
  }

  return scannedImages;
}

export function constructHomebaseWorkloadPayloads(
    scannedImages: ScanResult[],
    imageMetadata: IKubeImage[]): IDepGraphPayload[] {
  const results = scannedImages.map((scannedImage) => {
    const metadata = imageMetadata.find((meta) => meta.imageName === scannedImage.image)!;

    const { imageName: image, ...workloadLocator } = metadata;

    const imageLocator = {
      userLocator: config.INTEGRATION_ID,
      imageId: image,
      ...workloadLocator,
    };

    return {
      imageLocator,
      agentId: config.AGENT_ID,
      dependencyGraph: JSON.stringify(scannedImage.pluginResult),
    } as IDepGraphPayload;
  });

  return results;
}