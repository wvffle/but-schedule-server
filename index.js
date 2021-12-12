import fastify from 'fastify'
import peekaboo from 'fastify-peekaboo'
import blipp from 'fastify-blipp'
import zip from 'lodash.zipobject'
import pluralize from 'pluralize'
import dotenv from 'dotenv'

import { db } from './database/database.js'
import { checkUpdates } from './parser.js'

const CACHE_MS = 600000 /* 10 minutes */

dotenv.config()

const app = fastify()
await app.register(blipp)
await app.register(peekaboo, {
  expire: CACHE_MS
})

app.get('/', async () => {
    return {
        license: 'AGPL',
        authors: ['Kasper Seweryn (wvffle.net)']
    }
})

app.get('/updates', async (request) => {
  return db.updates.find()
  .sort({ date: 'desc' })
  .exec()
})

app.get('/updates/details/:hash', async (request) => {
  const update = await db.updates.findOne(request.params.hash).exec()
  if (!update) {
    return null
  }

  const keys = Object.keys(update.data)
  const values = await Promise.all(keys.map(key => db[key].findByIds(update.data[key])))
  return zip(keys, values.map(map => [...map.values()]))
})

app.get('/updates/:hash', async (request) => {
  return db.updates.findOne(request.params.hash).exec()
})

app.get('/diff/:hash', async (request) => {
  const update = await db.updates.findOne(request.params.hash).exec()
  if (!update) {
    return null
  }

  const keys = Object.keys(update.diff)
  const values = await Promise.all(keys.map(key => db[key].findByIds(update.diff[key].map(diff => diff[pluralize(key, 1)]))))

  const res = {}
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    res[key] = update.diff[key].map((data, j) => {
      const [value] = Object.keys(data).filter(key => key !== 'type')
      return {
        type: data.type,
        value: values[i].get(data[value])
      }
    })
  }

  return res
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
  // TODO : Push notification using Pushy.me/FCM
})

// NOTE: Check the updates at start and periodically
Promise.resolve().then(async () => {
  await checkUpdates()
  setInterval(checkUpdates, CACHE_MS)
})

try {
  await app.listen(process.env.PORT ?? 2137, '0.0.0.0')

  app.blipp()
  console.log(`server is running on ${app.server.address().port}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
