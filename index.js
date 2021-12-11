import fastify from 'fastify'
import peekaboo from 'fastify-peekaboo'

import { db } from './database/database.js'
import { checkUpdates } from './parser.js'

const CACHE_MS = 600000 /* 10 minutes */

const app = fastify()
await app.register(peekaboo, {
  expire: CACHE_MS
})

app.get('/updates', async (request) => {
  return db.updates.find()
  .sort({ date: 'desc' })
  .exec()
})

app.get('/updates/:hash', async (request) => {
  return db.updates.findOne(request.params.hash) .exec()
})

for (const key of ['rooms', 'titles', 'degrees', 'subjects', 'specialities', 'teachers', 'schedules']) {
  app.get(`/${key}`, async (request) => {
    return db[key].find()
      .exec()
  })

  app.get(`/${key}/:hash`, async (request) => {
    return db[key].findOne(request.params.hash)
      .exec()
  })
}


db.updates.insert$.subscribe(({ documentData }) => {
  const { hash } = documentData
  // TODO: Push notification using Pushy.me/FCM
})

// NOTE: Check the updates at start and periodically
Promise.resolve().then(async () => {
  await checkUpdates()
  setInterval(checkUpdates, CACHE_MS)
})

await app.listen(2137)