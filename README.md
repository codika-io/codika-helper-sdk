# @codika-io/helper-sdk

Codika helper SDK - types and utilities for use case configuration.

## Publishing to NPM

```bash
npm login
npm version patch  # or minor / major
npm publish --access=public

/Users/romainpattyn/.codika/codika-agent/scripts/update-helper-sdk-version.sh x.y.z
```

## Installation

```bash
npm install @codika-io/helper-sdk
```

## Usage

```typescript
import {
  loadAndEncodeWorkflow,
  type FormInputSchema,
  type FormOutputSchema,
  type HttpTrigger,
  type ProcessDeploymentConfigurationInput,
} from '@codika-io/helper-sdk';

// Load and encode a workflow JSON file
const workflowBase64 = loadAndEncodeWorkflow('/path/to/workflow.json');

// Use types for configuration
const config: ProcessDeploymentConfigurationInput = {
  title: 'My Use Case',
  subtitle: 'Description',
  description: 'Full description',
  workflows: [...],
  tags: [],
  integrationUids: [],
};
```

## Exports

### Types

- `FormInputSchema`, `FormOutputSchema` - Form field definitions
- `HttpTrigger`, `ScheduleTrigger`, `ServiceEventTrigger`, `SubworkflowTrigger` - Workflow trigger types
- `ProcessDeploymentConfigurationInput` - Main configuration type
- `DeploymentInputSchema`, `DeploymentParameterValues` - Deployment-time parameters
- `AgentConfig` - AI agent configuration
- `ProcessDataIngestionConfigInput` - Data ingestion configuration
- And more...

### Functions

- `loadAndEncodeWorkflow(path)` - Load a workflow JSON file and encode it to base64
- `loadWorkflowJson(path)` - Load a workflow JSON file
- `encodeWorkflowToBase64(workflow)` - Encode a workflow object to base64
- `decodeWorkflowFromBase64(base64)` - Decode a base64 string to workflow object
- `encodeWorkflowFromString(json)` - Encode a JSON string to base64

## License

MIT
