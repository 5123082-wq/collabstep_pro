-- Migration: AI Agent Configuration and Prompt Versions
-- For Brandbook Agent and future agents

-- AI Agent configuration table
CREATE TABLE "ai_agent_config" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "pipeline_type" text NOT NULL DEFAULT 'generative',
  "enabled" boolean DEFAULT true,
  "icon" text,
  "limits" jsonb,
  "parameters" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- AI Agent prompt versions table  
CREATE TABLE "ai_agent_prompt_version" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL,
  "version" integer NOT NULL,
  "status" text DEFAULT 'draft',
  "system_prompt" text,
  "prompts" jsonb,
  "created_by" text,
  "created_at" timestamp DEFAULT now()
);

-- Foreign key constraints
ALTER TABLE "ai_agent_prompt_version" ADD CONSTRAINT "ai_agent_prompt_version_agent_id_fk" 
  FOREIGN KEY ("agent_id") REFERENCES "ai_agent_config"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "ai_agent_prompt_version" ADD CONSTRAINT "ai_agent_prompt_version_created_by_fk" 
  FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Indexes
CREATE INDEX "ai_agent_config_slug_idx" ON "ai_agent_config" USING btree ("slug");
CREATE INDEX "ai_agent_config_enabled_idx" ON "ai_agent_config" USING btree ("enabled");

CREATE UNIQUE INDEX "ai_agent_prompt_version_agent_version_idx" 
  ON "ai_agent_prompt_version" ("agent_id", "version");
CREATE INDEX "ai_agent_prompt_version_agent_id_idx" ON "ai_agent_prompt_version" USING btree ("agent_id");
CREATE INDEX "ai_agent_prompt_version_status_idx" ON "ai_agent_prompt_version" USING btree ("status");

-- Seed Brandbook Agent
INSERT INTO "ai_agent_config" ("id", "slug", "name", "description", "pipeline_type", "enabled", "icon", "limits", "parameters")
VALUES (
  'brandbook-agent',
  'brandbook',
  'Brandbook Agent',
  'AI-дизайнер для создания брендбуков мерча. Принимает логотип и генерирует одностраничный визуальный макет.',
  'generative',
  true,
  'Palette',
  '{"maxRunsPerDay": 10, "maxConcurrentRuns": 1, "maxFileSizeBytes": 10485760}',
  '{"outputLanguage": "ru", "watermarkText": "сделано в Rubiform", "contactBlock": "contact@rubiform.example | +7 900 000-00-00"}'
);

-- Seed initial prompt version (draft)
INSERT INTO "ai_agent_prompt_version" ("id", "agent_id", "version", "status", "system_prompt", "prompts")
VALUES (
  'brandbook-prompt-v1',
  'brandbook-agent',
  1,
  'published',
  'Ты AI-дизайнер, специализирующийся на создании брендбуков для мерча. Ты помогаешь пользователям с логотипами и создаешь визуальные макеты продукции. Отвечай дружелюбно и профессионально. Все ответы на русском языке.',
  '{
    "intake": "Приветствую! Я помогу создать брендбук для вашего мерча.\n\nТребования к логотипу:\n- Format: PNG с прозрачностью (предпочтительно)\n- Минимум 800px по короткой стороне\n- Чистое изображение без артефактов\n\nВыберите набор продукции:\n• merch_basic: футболка, худи, кепка, кружка, шоппер\n• office_basic: визитка, бланк, конверт, блокнот, ручка\n\nВы можете загрузить файл, вставить logoFileId, или попросить демо-мокап без логотипа.",
    "logoCheck": "Проанализируй загруженный логотип по критериям:\n1. Размер: минимум 800px по короткой стороне\n2. Формат: PNG предпочтительно, JPG/BMP допустимы\n3. Прозрачность: есть ли прозрачный фон?\n4. Качество: нет артефактов сжатия, размытости\n\nЕсли есть проблемы — опиши их и предложи решение. Если всё OK — подтверди готовность.",
    "generate": "Создай визуальный макет брендбука для набора продукции {{productBundle}}.\n\nПрименить стиль: {{preferences}}\nЯзык оформления: {{outputLanguage}}\nВодяной знак: {{watermarkText}}\nКонтактный блок: {{contactBlock}}\n\nСоздай единый макет со всеми продуктами набора.",
    "qa": "Проверь сгенерированный макет:\n1. Логотип читаемый на всех продуктах?\n2. Цветовая гармония соблюдена?\n3. Нет визуальных артефактов?\n4. Водяной знак и контакты присутствуют?\n\nОтветь OK если всё хорошо, или опиши проблемы для регенерации.",
    "followup": "Брендбук готов! Хотите внести изменения?\n\n• Фон — изменить цвет или стиль фона\n• Цвета — скорректировать цветовую гамму\n• Раскладка — изменить расположение продуктов\n• Набор продукции — добавить/убрать продукты\n\nНапишите, что хотите изменить, или скажите \"сохранить\" для финализации."
  }'
);
