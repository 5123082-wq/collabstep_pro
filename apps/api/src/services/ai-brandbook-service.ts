import { Buffer } from 'node:buffer';
import { put } from '@vercel/blob';
import type {
  BrandbookAgentRunInput,
  BrandbookAgentRunMetadata
} from '../types';
import {
  aiAgentConfigsDbRepository,
  aiAgentPromptVersionsDbRepository
} from '../repositories/ai-agent-configs-repository';
import { brandbookAgentArtifactsRepository } from '../repositories/brandbook-agent-artifacts-repository';
import { brandbookAgentRunsRepository } from '../repositories/brandbook-agent-runs-repository';
import { userSubscriptionsRepository } from '../repositories/user-subscriptions-repository';
import { subscriptionPlansRepository } from '../repositories/subscription-plans-repository';
import { BrandbookAgentPipeline, blocksToPrompts, type BrandbookPipelineConfig, type BrandbookPromptBlock } from './ai/brandbook-pipeline';

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
  previewFormat: 'png'
};

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resolveImageMimeType(extension: string): string {
  const normalized = extension.toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') {
    return 'image/jpeg';
  }
  return 'image/png';
}

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

    // 2. Get user subscription and plan limits
    const userSubscription =
      await userSubscriptionsRepository.findByUserId(createdBy);
    const planCode = userSubscription?.planCode ?? 'free';
    const plan = await subscriptionPlansRepository.findByCode(planCode);

    // 3. Determine limits (plan takes priority over config)
    const maxRunsPerDay =
      plan?.aiAgentRunsPerDay ??
      (config.limits as { maxRunsPerDay?: number } | null)?.maxRunsPerDay ??
      10;
    const maxConcurrentRuns =
      plan?.aiAgentConcurrentRuns ??
      (config.limits as { maxConcurrentRuns?: number } | null)?.maxConcurrentRuns ??
      1;

    // 4. Check daily runs limit (-1 = unlimited)
    if (maxRunsPerDay !== -1) {
      const runsToday = await brandbookAgentRunsRepository.countRunsToday(
        organizationId,
        createdBy
      );
      if (runsToday >= maxRunsPerDay) {
        throw new Error(
          `Достигнут лимит запусков за день (${maxRunsPerDay}). Обновите подписку до Pro для увеличения лимита.`
        );
      }
    }

    // 5. Check concurrent runs limit
    if (maxConcurrentRuns !== -1) {
      const concurrentRuns = await brandbookAgentRunsRepository.countConcurrentRuns(
        organizationId,
        createdBy
      );
      if (concurrentRuns >= maxConcurrentRuns) {
        throw new Error(
          `Достигнут лимит одновременных запусков (${maxConcurrentRuns}). Дождитесь завершения текущих.`
        );
      }
    }

    // 6. Fetch Published Prompt Version
    const promptVersion = await aiAgentPromptVersionsDbRepository.findPublished(config.id);
    if (!promptVersion) {
      throw new Error('No published prompt version found for Brandbook agent. Please publish a version in Admin Panel.');
    }

    // 7. Create Run Record in DB
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

    // 8. Initialize Pipeline (dedicated key for Brandbook Agent only)
    const apiKey = process.env.BRANDBOOK_AGENT_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: BRANDBOOK_AGENT_OPENAI_API_KEY is missing. Set it in apps/web/.env.local for Brandbook generation.');
      await brandbookAgentRunsRepository.update(runRecord.id, { status: 'failed' });
      throw new Error('Brandbook Agent not configured (missing BRANDBOOK_AGENT_OPENAI_API_KEY)');
    }

    const configuredParameters = (config.parameters as BrandbookPipelineConfig['parameters']) || {};
    const dalleSizeEnv = process.env.BRANDBOOK_AGENT_DALLE_SIZE;
    const dallePreviewSizeEnv = process.env.BRANDBOOK_AGENT_DALLE_PREVIEW_SIZE;
    // DALL-E 3 поддерживает: 1024x1024, 1792x1024, 1024x1792
    // DALL-E 2 поддерживает: 256x256, 512x512, 1024x1024
    // Для совместимости с DALL-E 3 используем только его размеры
    const allowedDalleSizes = new Set([
      'auto',
      '1024x1024',
      '1792x1024',
      '1024x1792'
    ]);
    const dalleQualityEnv = process.env.BRANDBOOK_AGENT_DALLE_QUALITY;
    const dalleStyleEnv = process.env.BRANDBOOK_AGENT_DALLE_STYLE;
    const dalleQualityConfig = configuredParameters.dalleQuality;
    const dalleStyleConfig = configuredParameters.dalleStyle;
    const dalleSize =
      dalleSizeEnv && allowedDalleSizes.has(dalleSizeEnv)
        ? (dalleSizeEnv as BrandbookPipelineConfig['parameters']['dalleSize'])
        : configuredParameters.dalleSize;
    const dallePreviewSize =
      dallePreviewSizeEnv && allowedDalleSizes.has(dallePreviewSizeEnv)
        ? (dallePreviewSizeEnv as BrandbookPipelineConfig['parameters']['dallePreviewSize'])
        : configuredParameters.dallePreviewSize ?? '1024x1024'; // DALL-E 3 не поддерживает 512x512
    const dalleQuality =
      dalleQualityEnv === 'hd' || dalleQualityEnv === 'standard'
        ? dalleQualityEnv
        : dalleQualityConfig;
    const dalleStyle =
      dalleStyleEnv === 'vivid' || dalleStyleEnv === 'natural'
        ? dalleStyleEnv
        : dalleStyleConfig;

    const pipelineConfig: BrandbookPipelineConfig = {
      systemPrompt: promptVersion.systemPrompt || '',
      prompts: blocksToPrompts(
        promptVersion.blocks as BrandbookPromptBlock[] | null,
        promptVersion.prompts as BrandbookPipelineConfig['prompts'] | null
      ),
      parameters: {
        ...configuredParameters,
        model: process.env.BRANDBOOK_AGENT_OPENAI_MODEL || configuredParameters.model || 'gpt-3.5-turbo',
        ...(process.env.BRANDBOOK_AGENT_DALLE_MODEL || configuredParameters.dalleModel
          ? { dalleModel: process.env.BRANDBOOK_AGENT_DALLE_MODEL || configuredParameters.dalleModel }
          : {}),
        ...(dalleSize !== undefined ? { dalleSize } : {}),
        ...(dallePreviewSize ? { dallePreviewSize } : {}),
        ...(dalleQuality ? { dalleQuality } : {}),
        ...(dalleStyle ? { dalleStyle } : {})
      }
    };

    const pipeline = new BrandbookAgentPipeline(apiKey, pipelineConfig);

    // 9. Execute Pipeline (Async)
    // We execute it but don't await the full completion for the initial createRun response
    // if we want to return "queued" immediately.
    // However, it's better to update status to "processing" first.

    void this.executePipelineAsync(runRecord.id, pipeline, runInput, {
      organizationId: runRecord.organizationId
    });

    return {
      runId: runRecord.id,
      status: 'queued',
      metadata: {
        pipelineType: (runRecord.pipelineType as BrandbookAgentRunMetadata['pipelineType']) || 'generative',
        outputFormat: runRecord.outputFormat || 'png',
        previewFormat: runRecord.previewFormat || 'png'
      }
    };
  }

  private async executePipelineAsync(
    runId: string,
    pipeline: BrandbookAgentPipeline,
    input: BrandbookAgentRunInput,
    context: { organizationId: string }
  ) {
    try {
      await brandbookAgentRunsRepository.update(runId, { status: 'processing' });

      const pipelineInput = {
        productBundle: input.productBundle,
        ...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
        ...(input.logoFileId ? { logoFileId: input.logoFileId } : {}),
        ...(input.outputLanguage ? { outputLanguage: input.outputLanguage } : {}),
        ...(input.watermarkText ? { watermarkText: input.watermarkText } : {}),
        ...(input.contactBlock ? { contactBlock: input.contactBlock } : {})
      };

      const result = await pipeline.runFullPipeline(pipelineInput);

      if (result.success) {
        if (!result.image?.b64Json) {
          throw new Error('Pipeline finished without image payload');
        }

        await brandbookAgentRunsRepository.update(runId, { status: 'postprocessing' });

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        if (!blobToken) {
          throw new Error('BLOB_READ_WRITE_TOKEN is not set');
        }

        const imageBuffer = Buffer.from(result.image.b64Json, 'base64');
        const sizeBytes = imageBuffer.length;
        const dateSegment = new Date().toISOString().slice(0, 10);
        const previewFormat = 'png';
        const previewMimeType = resolveImageMimeType(previewFormat);
        const baseName = `brandbook-${runId}`;
        const previewFilename = sanitizeFilename(`${baseName}-preview.${previewFormat}`);
        const previewStorageKey = `organizations/${context.organizationId}/ai-generations/brandbook/previews/${dateSegment}/${previewFilename}`;
        const previewBlob = await put(previewStorageKey, imageBuffer, {
          access: 'public',
          contentType: previewMimeType,
          token: blobToken
        });

        await brandbookAgentArtifactsRepository.create({
          runId,
          kind: 'preview',
          storageKey: previewBlob.pathname,
          storageUrl: previewBlob.url,
          filename: previewFilename,
          mimeType: previewMimeType,
          sizeBytes
        });

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
