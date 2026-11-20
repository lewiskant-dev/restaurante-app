import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const backupDir = process.argv[2]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const buckets = ['albaranes', 'guest-menu']

if (!backupDir) throw new Error('Falta el directorio de backup.')
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const storageRoot = path.resolve(backupDir, 'storage')
await mkdir(storageRoot, { recursive: true, mode: 0o700 })

const checksums = []
const summary = []

function safeObjectPath(objectPath) {
  const normalized = path.posix.normalize(objectPath)
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error('Supabase devolvio una ruta de Storage no segura.')
  }
  return normalized
}

async function listFolder(bucket, folder = '') {
  const entries = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`${bucket}: no se pudo listar Storage (${error.message}).`)
    entries.push(...data)
    if (data.length < 1000) break
    offset += data.length
  }

  const objects = []
  for (const entry of entries) {
    const objectPath = folder ? `${folder}/${entry.name}` : entry.name
    if (entry.id == null) objects.push(...(await listFolder(bucket, objectPath)))
    else objects.push(safeObjectPath(objectPath))
  }
  return objects
}

for (const bucket of buckets) {
  const objects = await listFolder(bucket)
  let bytes = 0

  for (const objectPath of objects) {
    const { data, error } = await supabase.storage.from(bucket).download(objectPath)
    if (error) throw new Error(`${bucket}: no se pudo descargar un objeto (${error.message}).`)

    const buffer = Buffer.from(await data.arrayBuffer())
    const destination = path.join(storageRoot, bucket, ...objectPath.split('/'))
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
    await writeFile(destination, buffer, { mode: 0o600 })
    bytes += buffer.length
    checksums.push(`${createHash('sha256').update(buffer).digest('hex')}  storage/${bucket}/${objectPath}`)
  }

  summary.push({ bucket, objects: objects.length, bytes })
  console.log(`${bucket}: ${objects.length} objeto(s), ${bytes} bytes`)
}

await writeFile(path.join(backupDir, 'SHA256SUMS-STORAGE'), `${checksums.join('\n')}${checksums.length ? '\n' : ''}`, {
  mode: 0o600,
})
await writeFile(
  path.join(backupDir, 'storage-manifest.json'),
  `${JSON.stringify({ created_at_utc: new Date().toISOString(), buckets: summary }, null, 2)}\n`,
  { mode: 0o600 },
)

const manifestPath = path.join(backupDir, 'manifest.txt')
const manifest = await readFile(manifestPath, 'utf8')
await writeFile(
  manifestPath,
  manifest.replace(/^storage=.*$/m, 'storage=storage/albaranes,storage/guest-menu'),
  { mode: 0o600 },
)

console.log(`Storage completado: ${storageRoot}`)
