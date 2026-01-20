import type {
  AgentRunStatus,
  BrandbookAgentRunInput,
  BrandbookAgentRunMetadata
} from '../types';

export interface BrandbookAgentRunCreateResult {
  runId: string;
  status: AgentRunStatus;
  metadata: BrandbookAgentRunMetadata;
  previewFileId?: string;
  finalFileId?: string;
}

export interface BrandbookAgentService {
  createRun(input: BrandbookAgentRunInput): Promise<BrandbookAgentRunCreateResult>;
}

const DEFAULT_RUN_METADATA: BrandbookAgentRunMetadata = {
  pipelineType: 'generative',
  outputFormat: 'png',
  previewFormat: 'jpg'
};

export const createBrandbookRunMock: BrandbookAgentService['createRun'] = async (
  input
): Promise<BrandbookAgentRunCreateResult> => {
  void input;

  return {
    runId: crypto.randomUUID(),
    status: 'queued',
    metadata: DEFAULT_RUN_METADATA
  };
};
