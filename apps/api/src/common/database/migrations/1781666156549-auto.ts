import type { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1781666156549 implements MigrationInterface {
  name = "Auto1781666156549";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "app_user" ("id" character varying(64) NOT NULL, "email" character varying(160) NOT NULL, "display_name" character varying(120) NOT NULL, "avatar_url" text, "status" character varying(16) NOT NULL DEFAULT 'active', "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_22a5c4a3d9b2fb8e4e73fc4ada1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_app_user_email_unique" ON "app_user"  ("email") `
    );
    await queryRunner.query(
      `CREATE TABLE "user_identity" ("id" character varying(64) NOT NULL, "user_id" character varying(64) NOT NULL, "provider" character varying(32) NOT NULL, "provider_subject" character varying(191) NOT NULL, "provider_email" character varying(160) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_87b5856b206b5b77e6e2fa29508" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_identity_provider_unique" ON "user_identity"  ("provider", "provider_subject") `
    );
    await queryRunner.query(
      `CREATE TABLE "user_preference" ("user_id" character varying(64) NOT NULL, "proficiency_level" character varying(32) NOT NULL, "learning_goal" character varying(32) NOT NULL, "preferred_voice_id" character varying(120), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_34ace2da98735b1811eb2b9662f" PRIMARY KEY ("user_id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_password_credential" ("user_id" character varying(64) NOT NULL, "password_hash" character varying(191) NOT NULL, "password_algo" character varying(32) NOT NULL DEFAULT 'scrypt', "password_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_817379e155474e23659a765dbef" PRIMARY KEY ("user_id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "admin_user" ("id" character varying(64) NOT NULL, "username" character varying(80) NOT NULL, "password_hash" character varying(191) NOT NULL, "role" character varying(32) NOT NULL DEFAULT 'super_admin', "status" character varying(16) NOT NULL DEFAULT 'active', "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a28028ba709cd7e5053a86857b4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_admin_user_username_unique" ON "admin_user"  ("username") `
    );
    await queryRunner.query(
      `CREATE TABLE "auth_session" ("id" character varying(64) NOT NULL, "actor_type" character varying(16) NOT NULL, "actor_id" character varying(64) NOT NULL, "refresh_token_hash" character varying(128) NOT NULL, "user_agent" character varying(512), "ip_address" character varying(120), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_19354ed146424a728c1112a8cbf" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_auth_session_refresh_token_hash_unique" ON "auth_session"  ("refresh_token_hash") `
    );
    await queryRunner.query(
      `CREATE TABLE "practice_scenario" ("id" character varying(64) NOT NULL, "type" character varying(32) NOT NULL, "title" character varying(120) NOT NULL, "subtitle" text NOT NULL, "mode" character varying(32) NOT NULL, "difficulty" character varying(32) NOT NULL, "goal" text NOT NULL, "cover_url" text NOT NULL, "default_role_id" character varying(64) NOT NULL, "opening_line" text NOT NULL, "prompt_hint" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a8aefdfd75c7881fe9d6241b7e1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "scenario_role" ("id" character varying(64) NOT NULL, "scenario_id" character varying(64) NOT NULL, "code" character varying(32) NOT NULL, "name" character varying(120) NOT NULL, "description" text NOT NULL, "is_ai_role" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_51351cb5d74f4441d12ef4953d1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "conversation" ("id" character varying(64) NOT NULL, "user_id" character varying(64), "scenario_id" character varying(64) NOT NULL, "selected_role_id" character varying(64) NOT NULL, "mode" character varying(32) NOT NULL, "selected_difficulty" character varying(32), "provider" character varying(32) NOT NULL DEFAULT 'volcengine-rtc-ai', "provider_room_id" character varying(128), "provider_session_id" character varying(128), "status" character varying(32) NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "duration_seconds" integer NOT NULL DEFAULT '0', "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by_admin_id" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversation_deleted_at" ON "conversation"  ("deleted_at") `
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversation_status" ON "conversation"  ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversation_user_started_at" ON "conversation"  ("user_id", "started_at") `
    );
    await queryRunner.query(
      `CREATE TABLE "message" ("id" character varying(64) NOT NULL, "conversation_id" character varying(64) NOT NULL, "sequence_no" integer NOT NULL, "role" character varying(16) NOT NULL, "speaker_type" character varying(24) NOT NULL, "content" text NOT NULL, "content_type" character varying(16) NOT NULL, "provider_event_id" character varying(128), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_message_conversation_sequence" ON "message"  ("conversation_id", "sequence_no") `
    );
    await queryRunner.query(
      `CREATE TABLE "report" ("id" character varying(64) NOT NULL, "conversation_id" character varying(64) NOT NULL, "status" character varying(16) NOT NULL, "title" character varying(160) NOT NULL, "summary" text NOT NULL, "grammar_score" integer NOT NULL DEFAULT '0', "vocabulary_score" integer NOT NULL DEFAULT '0', "fluency_score" integer NOT NULL DEFAULT '0', "pronunciation_score" integer NOT NULL DEFAULT '0', "tone_score" integer NOT NULL DEFAULT '0', "naturalness_score" integer NOT NULL DEFAULT '0', "strengths_json" jsonb NOT NULL DEFAULT '[]', "issues_json" jsonb NOT NULL DEFAULT '[]', "suggestions_json" jsonb NOT NULL DEFAULT '[]', "pdf_url" text, "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by_admin_id" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_4da54b2440018ec16629196491" UNIQUE ("conversation_id"), CONSTRAINT "PK_99e4d0bea58cba73c57f935a546" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_report_deleted_at" ON "report"  ("deleted_at") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_report_conversation_unique" ON "report"  ("conversation_id") `
    );
    await queryRunner.query(
      `ALTER TABLE "user_identity" ADD CONSTRAINT "FK_2818839f889ab24f4077437753f" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_preference" ADD CONSTRAINT "FK_34ace2da98735b1811eb2b9662f" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_password_credential" ADD CONSTRAINT "FK_817379e155474e23659a765dbef" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "scenario_role" ADD CONSTRAINT "FK_30d11e31f4a3e2facd89223d1fd" FOREIGN KEY ("scenario_id") REFERENCES "practice_scenario"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_0825886afb03b1a6f11345b4e8c" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_a2685c36c5cf467948a20421f7a" FOREIGN KEY ("scenario_id") REFERENCES "practice_scenario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_8eee3dbcd0beb37d64e1bfe65a3" FOREIGN KEY ("selected_role_id") REFERENCES "scenario_role"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_4da54b2440018ec166291964912" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_4da54b2440018ec166291964912"`
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_8eee3dbcd0beb37d64e1bfe65a3"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_a2685c36c5cf467948a20421f7a"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_0825886afb03b1a6f11345b4e8c"`
    );
    await queryRunner.query(
      `ALTER TABLE "scenario_role" DROP CONSTRAINT "FK_30d11e31f4a3e2facd89223d1fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_password_credential" DROP CONSTRAINT "FK_817379e155474e23659a765dbef"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_preference" DROP CONSTRAINT "FK_34ace2da98735b1811eb2b9662f"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_identity" DROP CONSTRAINT "FK_2818839f889ab24f4077437753f"`
    );
    await queryRunner.query(`DROP INDEX "public"."idx_report_conversation_unique"`);
    await queryRunner.query(`DROP INDEX "public"."idx_report_deleted_at"`);
    await queryRunner.query(`DROP TABLE "report"`);
    await queryRunner.query(`DROP INDEX "public"."idx_message_conversation_sequence"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP INDEX "public"."idx_conversation_user_started_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_conversation_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_conversation_deleted_at"`);
    await queryRunner.query(`DROP TABLE "conversation"`);
    await queryRunner.query(`DROP TABLE "scenario_role"`);
    await queryRunner.query(`DROP TABLE "practice_scenario"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_auth_session_refresh_token_hash_unique"`
    );
    await queryRunner.query(`DROP TABLE "auth_session"`);
    await queryRunner.query(`DROP INDEX "public"."idx_admin_user_username_unique"`);
    await queryRunner.query(`DROP TABLE "admin_user"`);
    await queryRunner.query(`DROP TABLE "user_password_credential"`);
    await queryRunner.query(`DROP TABLE "user_preference"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_identity_provider_unique"`);
    await queryRunner.query(`DROP TABLE "user_identity"`);
    await queryRunner.query(`DROP INDEX "public"."idx_app_user_email_unique"`);
    await queryRunner.query(`DROP TABLE "app_user"`);
  }
}
