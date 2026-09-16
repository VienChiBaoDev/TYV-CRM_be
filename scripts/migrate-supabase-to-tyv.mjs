/**
 * One-time: copy all tables from SOURCE (public) → DEST (schema tyv).
 *
 * Prerequisites:
 *   1. DEST .env points to new Supabase (schema=tyv in URL).
 *   2. Run: npx prisma migrate deploy
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://..." node scripts/migrate-supabase-to-tyv.mjs
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(root, ".env"))

const SOURCE_URL = process.env.SOURCE_DATABASE_URL
const DEST_URL = process.env.DIRECT_URL || process.env.DATABASE_URL
const DEST_SCHEMA = "tyv"
const BATCH_SIZE = 300

if (!SOURCE_URL) {
  console.error("Missing SOURCE_DATABASE_URL (old Supabase direct URL).")
  process.exit(1)
}
if (!DEST_URL) {
  console.error("Missing DIRECT_URL / DATABASE_URL in .env (new Supabase).")
  process.exit(1)
}

function pgClient(connectionString) {
  const url = connectionString.includes("uselibpqcompat=")
    ? connectionString
    : `${connectionString}${connectionString.includes("?") ? "&" : "?"}uselibpqcompat=true&sslmode=require`
  return new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
}

async function listPublicTables(client) {
  const { rows } = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT LIKE 'pg_%'
     ORDER BY tablename`,
  )
  return rows.map((r) => r.tablename)
}

async function tableExistsInSchema(client, schema, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2`,
    [schema, table],
  )
  return rows.length > 0
}

async function copyTable(source, dest, table) {
  const exists = await tableExistsInSchema(dest, DEST_SCHEMA, table)
  if (!exists) {
    console.warn(`  skip ${table}: not in ${DEST_SCHEMA} (run prisma migrate deploy?)`)
    return { table, rows: 0, skipped: true }
  }

  const { rows: countRow } = await source.query(
    `SELECT COUNT(*)::int AS c FROM public."${table}"`,
  )
  const total = countRow[0]?.c ?? 0
  if (total === 0) {
    return { table, rows: 0, skipped: false }
  }

  const { rows: colRows } = await source.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  )
  const columns = colRows.map((r) => r.column_name)
  const quotedCols = columns.map((c) => `"${c}"`).join(", ")
  const rowPlaceholders = `(${columns.map((_, i) => `$${i + 1}`).join(", ")})`

  let copied = 0
  let offset = 0
  while (offset < total) {
    const { rows } = await source.query(
      `SELECT ${quotedCols} FROM public."${table}" LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    )
    if (rows.length === 0) break

    for (const row of rows) {
      const values = columns.map((c) => row[c])
      await dest.query(
        `INSERT INTO "${DEST_SCHEMA}"."${table}" (${quotedCols}) VALUES ${rowPlaceholders}`,
        values,
      )
      copied += 1
    }
    offset += BATCH_SIZE
    process.stdout.write(`  ${table}: ${Math.min(offset, total)}/${total}\n`)
  }

  return { table, rows: copied, skipped: false }
}

async function fixSequences(dest) {
  const { rows } = await dest.query(
    `SELECT sequence_schema, sequence_name
     FROM information_schema.sequences
     WHERE sequence_schema = $1`,
    [DEST_SCHEMA],
  )
  for (const { sequence_schema, sequence_name } of rows) {
    const seq = `"${sequence_schema}"."${sequence_name}"`
    const col = sequence_name.replace(/_id_seq$/, "")
    const tableGuess = sequence_name.replace(/_id_seq$/, "")
    try {
      await dest.query(
        `SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${DEST_SCHEMA}"."${tableGuess}"), 1), true)`,
      )
    } catch {
      /* not all sequences map to id column */
    }
  }
}

async function main() {
  const source = pgClient(SOURCE_URL)
  const dest = pgClient(DEST_URL)

  console.log("Connecting to source and destination...")
  await source.connect()
  await dest.connect()
  await dest.query(`CREATE SCHEMA IF NOT EXISTS "${DEST_SCHEMA}"`)
  await dest.query(`SET search_path TO "${DEST_SCHEMA}"`)

  const tables = await listPublicTables(source)
  const dataTables = tables.filter((t) => t !== "_prisma_migrations")
  console.log(`Found ${dataTables.length} tables in source public schema.`)

  const { rows: destTables } = await dest.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = $1 AND tablename <> '_prisma_migrations'`,
    [DEST_SCHEMA],
  )
  if (destTables.length > 0) {
    const list = destTables
      .map((r) => `"${DEST_SCHEMA}"."${r.tablename}"`)
      .join(", ")
    console.log(`Truncating ${destTables.length} tables in ${DEST_SCHEMA} (once)...`)
    await dest.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  }

  await dest.query("SET session_replication_role = replica")
  const summary = []
  for (const table of dataTables) {
    console.log(`Copying ${table}...`)
    summary.push(await copyTable(source, dest, table))
  }
  await dest.query("SET session_replication_role = DEFAULT")

  console.log("Fixing sequences (where applicable)...")
  await fixSequences(dest)

  await source.end()
  await dest.end()

  console.log("\nDone:")
  for (const s of summary) {
    if (s.skipped) console.log(`  - ${s.table}: skipped`)
    else console.log(`  - ${s.table}: ${s.rows} rows`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
