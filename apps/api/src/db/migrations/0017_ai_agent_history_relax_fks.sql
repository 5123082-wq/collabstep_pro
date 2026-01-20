-- Migration: relax AI agents history FKs for separate storage DB

ALTER TABLE "brandbook_agent_run"
  DROP CONSTRAINT IF EXISTS "brandbook_agent_run_organization_id_organization_id_fk";

ALTER TABLE "brandbook_agent_run"
  DROP CONSTRAINT IF EXISTS "brandbook_agent_run_project_id_project_id_fk";

ALTER TABLE "brandbook_agent_run"
  DROP CONSTRAINT IF EXISTS "brandbook_agent_run_created_by_user_id_fk";

ALTER TABLE "brandbook_agent_artifact"
  DROP CONSTRAINT IF EXISTS "brandbook_agent_artifact_file_id_file_id_fk";
