import fastify from 'fastify'
import peekaboo from 'fastify-peekaboo'
import blipp from 'fastify-blipp'
import zip from 'lodash.zipobject'
import pluralize from 'pluralize'
import dotenv from 'dotenv'

import db from './models/index.js'
import { checkUpdates } from './parser.mjs'

const CACHE_MS = 600000 /* 10 minutes */

dotenv.config()

const app = fastify()
await app.register(blipp)
await app.register(peekaboo, {
  expire: CACHE_MS
})

const { Op } = db.Sequelize
const modelMap = {
  rooms: db.Room,
  titles: db.Title,
  degrees: db.Degree,
  subjects: db.Subject,
  specialities: db.Speciality,
  teachers: db.Teacher,
  schedules: db.Schedule
}

app.get('/', async () => {
    return {
        license: 'AGPL',
        authors: ['Kasper Seweryn (wvffle.net)']
    }
})

app.get('/updates', async (request) => {
  return db.Update.findAll({
    order: [['date', 'DESC']]
  })
})

app.get('/updates/details/:hash', async (request) => {
  const { hash } = request.params
  const update = await db.Update.findOne({
    where: {
      [Op.or]: [
        { id: hash },
        { hash }
      ]
    }
  })

  if (!update) {
    return null
  }

  const keys = Object.keys(update.data)
  const values = await Promise.all(keys.map(key => modelMap[key].findAll({
    where: {
      hash: {
        [Op.or]: update.data[key]
      }
    }
  })))

  return zip(keys, values)
})

app.get('/updates/:hash', async (request) => {
  const { hash } = request.params
  console.log(hash)
  return db.Update.findOne({
    where: {
      [Op.or]: [
        { id: hash },
        { hash }
      ]
    }
  })
})

app.get('/diff/:hash', async (request) => {
  const { hash } = request.params
  const update = await db.Update.findOne({
    where: {
      [Op.or]: [
        { id: hash },
        { hash }
      ]
    }
  })

  if (!update) {
    return null
  }

  const keys = Object.keys(update.diff)
  const values = await Promise.all(keys.map(key => modelMap[key].findAll({
    where: {
      hash: {
        [Op.or]: update.diff[key].map(diff => diff[pluralize(key, 1)])
      }
    }
  })))

  const res = {}
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    res[key] = update.diff[key].map((data, j) => {
      const [value] = Object.keys(data).filter(key => key !== 'type')
      return {
        type: data.type,
        value: values[i].find(x => x.get('hash') === data[value])
      }
    })
  }

  return res
})

for (const key of ['rooms', 'titles', 'degrees', 'subjects', 'specialities', 'teachers', 'schedules']) {
  app.get(`/${key}`, async (request) => {
    return modelMap[key].findAll()
  })

  app.get(`/${key}/:hash`, async (request) => {
    const { hash } = request.params
    return modelMap[key].findOne({
      where: {
        [Op.or]: [
          { id: hash },
          { hash }
        ]
      }
    })
  })
}

db.on('update', (update) => {
  const hash = update.get('hash')
  // TODO : Push notification using Pushy.me/FCM
  console.log('hash')
})

// NOTE: Check the updates at start and periodically
Promise.resolve().then(async () => {
  await checkUpdates().catch(console.error)
  setInterval(() => checkUpdates().catch(console.error), CACHE_MS)
})

try {
  await app.listen(process.env.PORT ?? 2137, '0.0.0.0')
  app.blipp()

  console.log(`server is running on ${app.server.address().port}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}