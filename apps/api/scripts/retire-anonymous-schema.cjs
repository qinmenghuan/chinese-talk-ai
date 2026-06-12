const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

function loadRootEnv() {
  const envPath = path.resolve(__dirname, "../../..", ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function countRows(client, sql) {
  const result = await client.query(sql);
  return Number(result.rows[0]?.count ?? 0);
}

async function run() {
  loadRootEnv();

  const client = new Client({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: asNumber(process.env.POSTGRES_PORT, 5432),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "",
    database: process.env.POSTGRES_DB ?? "learn_chinese_ai",
    ssl:
      process.env.DATABASE_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  });

  await client.connect();

  const hasConversationTable = await tableExists(client, "conversation");
  const hasReportTable = await tableExists(client, "report");
  const hasMessageTable = await tableExists(client, "message");
  const hasAnonymousSessionTable = await tableExists(client, "anonymous_session");
  const hasAnonymousColumn =
    hasConversationTable &&
    (await columnExists(client, "conversation", "anonymous_session_id"));
  const anonymousOnlyConversationCount = hasConversationTable
    ? await countRows(client, "SELECT COUNT(*) FROM conversation WHERE user_id IS NULL")
    : 0;
  const linkedAnonymousConversationCount =
    hasConversationTable && hasAnonymousColumn
      ? await countRows(
          client,
          "SELECT COUNT(*) FROM conversation WHERE anonymous_session_id IS NOT NULL"
        )
      : 0;
  const anonymousSessionCount = hasAnonymousSessionTable
    ? await countRows(client, "SELECT COUNT(*) FROM anonymous_session")
    : 0;

  await client.query("BEGIN");

  try {
    let deletedReports = 0;
    let deletedMessages = 0;
    let deletedConversations = 0;

    if (hasConversationTable && hasReportTable) {
      const result = await client.query(`
        DELETE FROM report
        USING conversation
        WHERE report.conversation_id = conversation.id
          AND conversation.user_id IS NULL
      `);
      deletedReports = result.rowCount ?? 0;
    }

    if (hasConversationTable && hasMessageTable) {
      const result = await client.query(`
        DELETE FROM message
        USING conversation
        WHERE message.conversation_id = conversation.id
          AND conversation.user_id IS NULL
      `);
      deletedMessages = result.rowCount ?? 0;
    }

    if (hasConversationTable) {
      const result = await client.query("DELETE FROM conversation WHERE user_id IS NULL");
      deletedConversations = result.rowCount ?? 0;
    }

    if (hasConversationTable && hasAnonymousColumn) {
      await client.query(
        "ALTER TABLE conversation DROP COLUMN IF EXISTS anonymous_session_id"
      );
    }

    if (hasAnonymousSessionTable) {
      await client.query("DROP TABLE IF EXISTS anonymous_session");
    }

    if (hasConversationTable) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_conversation_user_started_at
        ON conversation (user_id, started_at)
      `);
    }

    await client.query("COMMIT");

    const hasAnonymousSessionTableAfter = await tableExists(client, "anonymous_session");
    const hasAnonymousColumnAfter =
      hasConversationTable &&
      (await columnExists(client, "conversation", "anonymous_session_id"));

    console.log(
      JSON.stringify(
        {
          before: {
            anonymousSessionCount,
            anonymousOnlyConversationCount,
            linkedAnonymousConversationCount,
          },
          deleted: {
            reports: deletedReports,
            messages: deletedMessages,
            conversations: deletedConversations,
          },
          after: {
            anonymousSessionTableExists: hasAnonymousSessionTableAfter,
            conversationAnonymousSessionColumnExists: hasAnonymousColumnAfter,
          },
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
