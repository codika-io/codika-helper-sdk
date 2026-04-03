/**
 * Config Loader
 * Loads a use case's config.ts and extracts configuration data.
 * Reuses the same dynamic import pattern as use-case-deployer.ts.
 */

import { join } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import type {
  ProcessDeploymentConfigurationInput,
  CustomIntegrationSchema,
} from '../types/process-types.js';

interface ConfigModule {
  getConfiguration: () => ProcessDeploymentConfigurationInput;
}

/**
 * Dynamically imports config.ts (or config.js) from a use case folder
 * and returns the deployment configuration.
 */
export async function loadConfiguration(
  useCasePath: string,
): Promise<ProcessDeploymentConfigurationInput> {
  const configTsPath = join(useCasePath, 'config.ts');
  const configJsPath = join(useCasePath, 'config.js');

  const configPath = existsSync(configTsPath) ? configTsPath : configJsPath;
  if (!existsSync(configPath)) {
    throw new Error(`No config.ts or config.js found at ${useCasePath}`);
  }

  const configUrl = pathToFileURL(configPath).href;

  let configModule: ConfigModule;
  try {
    configModule = (await import(configUrl)) as ConfigModule;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config at ${configPath}: ${msg}`);
  }

  if (typeof configModule.getConfiguration !== 'function') {
    throw new Error(`config at ${useCasePath} must export a getConfiguration function`);
  }

  return configModule.getConfiguration();
}

/**
 * Extracts a custom integration schema from a use case's config.ts
 * by matching the integration ID in the customIntegrations array.
 * Returns null if not found.
 */
export async function extractCustomIntegrationSchema(
  useCasePath: string,
  integrationId: string,
): Promise<CustomIntegrationSchema | null> {
  const config = await loadConfiguration(useCasePath);

  if (!config.customIntegrations?.length) {
    return null;
  }

  return config.customIntegrations.find((ci) => ci.id === integrationId) ?? null;
}
