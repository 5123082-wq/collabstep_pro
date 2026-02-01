import { Buffer } from 'node:buffer';
import { put } from '@vercel/blob';
import { and, eq, isNull } from 'drizzle-orm';
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
import { organizationStorageUsageRepository } from '../repositories/organization-storage-usage-repository';
import { db } from '../db/config';
import { files, folders } from '../db/schema';
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
  previewFormat: 'png'
};

const BRANDBOOK_ROOT_FOLDER = 'AI Generations';
const BRANDBOOK_CHILD_FOLDER = 'Brandbook';

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

async function ensureOrganizationFolder(params: {
  organizationId: string;
  name: string;
  parentId?: string | null;
  createdBy: string;
}): Promise<{ id: string }> {
  const conditions = [
    eq(folders.organizationId, params.organizationId),
    eq(folders.name, params.name),
    eq(folders.type, 'custom')
  ];

  if (params.parentId) {
    conditions.push(eq(folders.parentId, params.parentId));
  } else {
    conditions.push(isNull(folders.parentId));
  }

  conditions.push(isNull(folders.projectId));

  const [existing] = await db
    .select()
    .from(folders)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(folders)
    .values({
      organizationId: params.organizationId,
      projectId: null,
      taskId: null,
      parentId: params.parentId ?? null,
      name: params.name,
      type: 'custom',
      createdBy: params.createdBy
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create organization folder');
  }

  return created;
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

    // 4. Initialize Pipeline (dedicated key for Brandbook Agent only)
    const apiKey = process.env.BRANDBOOK_AGENT_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: BRANDBOOK_AGENT_OPENAI_API_KEY is missing. Set it in apps/web/.env.local for Brandbook generation.');
      await brandbookAgentRunsRepository.update(runRecord.id, { status: 'failed' });
      throw new Error('Brandbook Agent not configured (missing BRANDBOOK_AGENT_OPENAI_API_KEY)');
    }

    const configuredParameters = (config.parameters as BrandbookPipelineConfig['parameters']) || {};
    const dalleSizeEnv = process.env.BRANDBOOK_AGENT_DALLE_SIZE;
    const allowedDalleSizes = new Set([
      'auto',
      '1024x1024',
      '1536x1024',
      '1024x1536',
      '256x256',
      '512x512',
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
      prompts: (promptVersion.prompts as BrandbookPipelineConfig['prompts']) || {},
      parameters: {
        ...configuredParameters,
        model: process.env.BRANDBOOK_AGENT_OPENAI_MODEL || configuredParameters.model || 'gpt-3.5-turbo',
        ...(process.env.BRANDBOOK_AGENT_DALLE_MODEL || configuredParameters.dalleModel
          ? { dalleModel: process.env.BRANDBOOK_AGENT_DALLE_MODEL || configuredParameters.dalleModel }
          : {}),
        ...(dalleSize !== undefined ? { dalleSize } : {}),
        ...(dalleQuality ? { dalleQuality } : {}),
        ...(dalleStyle ? { dalleStyle } : {})
      }
    };

    const pipeline = new BrandbookAgentPipeline(apiKey, pipelineConfig);

    // 5. Execute Pipeline (Async)
    // We execute it but don't await the full completion for the initial createRun response
    // if we want to return "queued" immediately.
    // However, it's better to update status to "processing" first.

    void this.executePipelineAsync(runRecord.id, pipeline, runInput, {
      organizationId: runRecord.organizationId,
      createdBy: runRecord.createdBy
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
    context: { organizationId: string; createdBy: string }
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
        const outputFormat = 'png';
        const previewFormat = 'png';
        const outputMimeType = resolveImageMimeType(outputFormat);
        const previewMimeType = resolveImageMimeType(previewFormat);
        const baseName = `brandbook-${runId}`;

        const finalFilename = sanitizeFilename(`${baseName}-final.${outputFormat}`);
        const finalStorageKey = `organizations/${context.organizationId}/ai-generations/brandbook/${dateSegment}/${finalFilename}`;
        const finalBlob = await put(finalStorageKey, imageBuffer, {
          access: 'public',
          contentType: outputMimeType,
          token: blobToken
        });

        const rootFolder = await ensureOrganizationFolder({
          organizationId: context.organizationId,
          name: BRANDBOOK_ROOT_FOLDER,
          createdBy: context.createdBy
        });

        const brandbookFolder = await ensureOrganizationFolder({
          organizationId: context.organizationId,
          name: BRANDBOOK_CHILD_FOLDER,
          parentId: rootFolder.id,
          createdBy: context.createdBy
        });

        const [createdFile] = await db
          .insert(files)
          .values({
            organizationId: context.organizationId,
            projectId: null,
            uploadedBy: context.createdBy,
            filename: finalFilename,
            mimeType: outputMimeType,
            sizeBytes,
            storageKey: finalBlob.pathname,
            storageUrl: finalBlob.url,
            sha256: null,
            description: null,
            folderId: brandbookFolder.id,
            taskId: null
          })
          .returning();

        if (!createdFile) {
          throw new Error('Failed to create brandbook file record');
        }

        await brandbookAgentArtifactsRepository.create({
          runId,
          fileId: createdFile.id,
          kind: 'final'
        });

        await organizationStorageUsageRepository.increment(context.organizationId, sizeBytes);

        try {
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
        } catch (previewError) {
          console.error(`Failed to store preview for run ${runId}:`, previewError);
        }

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
