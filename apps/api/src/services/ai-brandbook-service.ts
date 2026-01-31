import type {
  BrandbookAgentRunInput,
  BrandbookAgentRunMetadata
} from '../types';
import {
  aiAgentConfigsDbRepository,
  aiAgentPromptVersionsDbRepository
} from '../repositories/ai-agent-configs-repository';
import { brandbookAgentRunsRepository } from '../repositories/brandbook-agent-runs-repository';
import { BrandbookAgentPipeline, type BrandbookPipelineConfig } from './ai/brandbook-pipeline';

export interface BrandbookAgentRunCreateResult {
  runId: string;
  status: 'queued' | 'processing' | 'failed';
  metadata: BrandbookAgentRunMetadata;
}

export interface BrandbookAgentService {
  createRun(input: BrandbookAgentRunInput & { organizationId: string; createdBy: string }): Promise<BrandbookAgentRunCreateResult>;
}

const DEFAULT_RUN_METADATA: BrandbookAgentRunMetadata = {
  pipelineType: 'generative',
  outputFormat: 'png',
  previewFormat: 'jpg'
};

export class BrandbookAgentServiceImpl implements BrandbookAgentService {
  /**
   * Create and execute a brandbook generation run
   */
  async createRun(input: BrandbookAgentRunInput & { organizationId: string; createdBy: string }): Promise<BrandbookAgentRunCreateResult> {
    const { organizationId, createdBy, ...runInput } = input;

    // 1. Fetch Brandbook Agent Configuration
    const config = await aiAgentConfigsDbRepository.findBySlug('brandbook');
    if (!config) {
      throw new Error('Brandbook agent not configured. Please check database seed.');
    }

    if (!config.enabled) {
      throw new Error('Brandbook agent is currently disabled.');
    }

    // 2. Fetch Published Prompt Version
    const promptVersion = await aiAgentPromptVersionsDbRepository.findPublished(config.id);
    if (!promptVersion) {
      throw new Error('No published prompt version found for Brandbook agent. Please publish a version in Admin Panel.');
    }

    // 3. Create Run Record in DB
    const runRecord = await brandbookAgentRunsRepository.create({
      id: crypto.randomUUID(),
      organizationId,
      createdBy,
      projectId: runInput.projectId || null,
      taskId: runInput.taskId || null,
      status: 'queued',
      productBundle: runInput.productBundle,
      preferences: runInput.preferences || null,
      outputLanguage: runInput.outputLanguage || config.parameters?.outputLanguage || 'ru',
      watermarkText: runInput.watermarkText || config.parameters?.watermarkText || null,
      contactBlock: runInput.contactBlock || config.parameters?.contactBlock || null,
      logoFileId: runInput.logoFileId || null,
      pipelineType: config.pipelineType || 'generative',
      outputFormat: DEFAULT_RUN_METADATA.outputFormat,
      previewFormat: DEFAULT_RUN_METADATA.previewFormat,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Initialize Pipeline
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: OPENAI_API_KEY is missing');
      await brandbookAgentRunsRepository.update(runRecord.id, { status: 'failed' });
      throw new Error('AI Provider not configured (missing API Key)');
    }

    const pipelineConfig: BrandbookPipelineConfig = {
      systemPrompt: promptVersion.systemPrompt || '',
      prompts: (promptVersion.prompts as BrandbookPipelineConfig['prompts']) || {},
      parameters: (config.parameters as BrandbookPipelineConfig['parameters']) || {}
    };

    const pipeline = new BrandbookAgentPipeline(apiKey, pipelineConfig);

    // 5. Execute Pipeline (Async)
    // We execute it but don't await the full completion for the initial createRun response
    // if we want to return "queued" immediately.
    // However, it's better to update status to "processing" first.

    void this.executePipelineAsync(runRecord.id, pipeline, runInput);

    return {
      runId: runRecord.id,
      status: 'queued',
      metadata: {
        pipelineType: (runRecord.pipelineType as BrandbookAgentRunMetadata['pipelineType']) || 'generative',
        outputFormat: runRecord.outputFormat || 'png',
        previewFormat: runRecord.previewFormat || 'jpg'
      }
    };
  }

  private async executePipelineAsync(runId: string, pipeline: BrandbookAgentPipeline, input: BrandbookAgentRunInput) {
    try {
      await brandbookAgentRunsRepository.update(runId, { status: 'processing' });

      const result = await pipeline.runFullPipeline({
        productBundle: input.productBundle,
        preferences: input.preferences || undefined,
        logoFileId: input.logoFileId || undefined,
        outputLanguage: input.outputLanguage || undefined,
        watermarkText: input.watermarkText || undefined,
        contactBlock: input.contactBlock || undefined
      });

      if (result.success) {
        // Here we would normally save the files (preview/final) to storage
        // For now, we just mark as postprocessing then done
        await brandbookAgentRunsRepository.update(runId, { status: 'postprocessing' });

        // TODO: Integration with FileStorage for actual artifacts

        await brandbookAgentRunsRepository.update(runId, { status: 'done' });
      } else {
        console.error(`Pipeline failed for run ${runId}:`, result.error);
        await brandbookAgentRunsRepository.update(runId, { status: 'failed' });
      }
    } catch (error) {
      console.error(`Error in executePipelineAsync for run ${runId}:`, error);
      await brandbookAgentRunsRepository.update(runId, { status: 'failed' });
    }
  }
}

export const brandbookAgentService = new BrandbookAgentServiceImpl();

// Keep the mock for compatibility if needed, but the main export should be the service
export const createBrandbookRunMock = brandbookAgentService.createRun.bind(brandbookAgentService);
