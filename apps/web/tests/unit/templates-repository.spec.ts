import { templatesRepository, memory } from '@collabverse/api';
import type { ProjectTemplate } from '@collabverse/api';

describe('TemplatesRepository', () => {
  beforeEach(() => {
    // Reset memory templates to initial state
    memory.TEMPLATES = [
      {
        id: 'tpl-admin-discovery',
        title: 'Админский discovery',
        kind: 'product',
        summary: 'Скрипты интервью, CJM и гипотезы для старта команды.',
        projectType: 'product',
        projectStage: 'discovery',
        projectVisibility: 'private'
      }
    ] as ProjectTemplate[];
  });

  describe('list', () => {
    it('returns all templates', () => {
      const templates = templatesRepository.list();
      expect(templates).toHaveLength(1);
      expect(templates[0]?.id).toBe('tpl-admin-discovery');
    });

    it('returns cloned templates (not references)', () => {
      const templates1 = templatesRepository.list();
      const templates2 = templatesRepository.list();
      expect(templates1[0]).not.toBe(templates2[0]);
      expect(templates1[0]).toEqual(templates2[0]);
    });
  });

  describe('findById', () => {
    it('finds template by id', () => {
      const template = templatesRepository.findById('tpl-admin-discovery');
      expect(template).not.toBeNull();
      expect(template?.title).toBe('Админский discovery');
    });

    it('returns null for non-existent id', () => {
      const template = templatesRepository.findById('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('create', () => {
    it('creates new template with all fields', () => {
      const newTemplate = templatesRepository.create({
        title: 'Test Template',
        kind: 'product',
        summary: 'Test summary',
        projectType: 'product',
        projectStage: 'design',
        projectVisibility: 'public'
      });

      expect(newTemplate.id).toMatch(/^tpl-admin-/);
      expect(newTemplate.title).toBe('Test Template');
      expect(newTemplate.kind).toBe('product');
      expect(newTemplate.summary).toBe('Test summary');
      expect(newTemplate.projectType).toBe('product');
      expect(newTemplate.projectStage).toBe('design');
      expect(newTemplate.projectVisibility).toBe('public');
      expect(newTemplate.createdAt).toBeDefined();
      expect(newTemplate.updatedAt).toBeDefined();

      const templates = templatesRepository.list();
      expect(templates).toHaveLength(2);
    });

    it('creates template with optional fields', () => {
      const newTemplate = templatesRepository.create({
        title: 'Minimal Template',
        kind: 'brand',
        summary: 'Minimal summary'
      });

      expect(newTemplate.title).toBe('Minimal Template');
      expect(newTemplate.projectType).toBeUndefined();
      expect(newTemplate.projectStage).toBeUndefined();
      expect(newTemplate.projectVisibility).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates existing template', () => {
      const updated = templatesRepository.update('tpl-admin-discovery', {
        title: 'Updated Title',
        projectStage: 'build'
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.projectStage).toBe('build');
      expect(updated?.kind).toBe('product'); // Unchanged
      expect(updated?.updatedAt).toBeDefined();

      const template = templatesRepository.findById('tpl-admin-discovery');
      expect(template?.title).toBe('Updated Title');
    });

    it('returns null for non-existent id', () => {
      const updated = templatesRepository.update('non-existent', {
        title: 'Updated'
      });
      expect(updated).toBeNull();
    });

    it('updates all extended fields', () => {
      const updated = templatesRepository.update('tpl-admin-discovery', {
        projectType: 'marketing',
        projectStage: 'launch',
        projectVisibility: 'public'
      });

      expect(updated?.projectType).toBe('marketing');
      expect(updated?.projectStage).toBe('launch');
      expect(updated?.projectVisibility).toBe('public');
    });
  });

  describe('delete', () => {
    it('deletes existing template', () => {
      const deleted = templatesRepository.delete('tpl-admin-discovery');
      expect(deleted).toBe(true);

      const templates = templatesRepository.list();
      expect(templates).toHaveLength(0);
    });

    it('returns false for non-existent id', () => {
      const deleted = templatesRepository.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });
});

