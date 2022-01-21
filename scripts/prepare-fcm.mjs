import { encrypt } from '../crypt-utils.mjs'
import { readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

const root = join(dirname(import.meta.url.replace('file://', '')), '..')
const file = await readFile(join(root, 'fcm-cert.json'))
await writeFile(join(root, 'fcm-cert'), encrypt(file))
console.log('fcm-cert written.')