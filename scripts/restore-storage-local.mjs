import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const backupDir = process.argv[2]
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!backupDir) throw new Error('Falta el directorio de backup.')
if (!supabaseUrl || !serviceRoleKey) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')

const target = new URL(supabaseUrl)
if (!['127.0.0.1', 'localhost'].includes(target.hostname)) {
  throw new Error('Restauracion bloqueada: este comando solo admite Supabase local.')
}

const storageRoot = path.resolve(backupDir, 'storage')
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files
}

for (const bucket of ['albaranes', 'guest-menu']) {
  const bucketRoot = path.join(storageRoot, bucket)
  const files = await listFiles(bucketRoot)
  let bytes = 0

  for (const file of files) {
    const objectPath = path.relative(bucketRoot, file).split(path.sep).join('/')
    const contents = await readFile(file)
    const { error } = await supabase.storage.from(bucket).upload(objectPath, contents, {
      cacheControl: '3600',
      contentType: 'application/octet-stream',
      upsert: true,
    })
    if (error) throw new Error(`${bucket}: no se pudo restaurar un objeto (${error.message}).`)

    const { data: restored, error: downloadError } = await supabase.storage.from(bucket).download(objectPath)
    if (downloadError) throw new Error(`${bucket}: no se pudo verificar un objeto (${downloadError.message}).`)
    const restoredContents = Buffer.from(await restored.arrayBuffer())
    const expectedHash = createHash('sha256').update(contents).digest('hex')
    const restoredHash = createHash('sha256').update(restoredContents).digest('hex')
    if (expectedHash !== restoredHash) throw new Error(`${bucket}: hash distinto despues de restaurar.`)
    bytes += contents.length
  }

  console.log(`${bucket}: ${files.length} objeto(s) restaurados y verificados, ${bytes} bytes`)
}
