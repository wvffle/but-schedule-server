import fastify from 'fastify'
import peekaboo from 'fastify-peekaboo'
import blipp from 'fastify-blipp'
import zip from 'lodash.zipobject'
import pluralize from 'pluralize'
import dotenv from 'dotenv'

import db from './models/index.js'
import { checkUpdates } from './parser.mjs'
import admin from 'firebase-admin'
import { readFile } from 'fs/promises'

const serviceAccount = JSON.parse(`${await readFile('./fcm-cert.json')}`)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

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
  const updates = await db.Update.findAll({
    order: [['date', 'DESC']]
  })

  return updates.map(update => {
    return {
      id: update.id,
      hash: update.hash,
      date: update.date
    }
  })
})

app.get('/updates/:hash', async (request) => {
  const { hash } = request.params
  const update = await db.Update.findOne({
    where: {
      [Op.or]: [
        { id: isNaN(+hash) ? -1 : hash },
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
      id: {
        [Op.or]: update.data[key].map(({ id }) => id)
      }
    }
  })))

  return {
    id: update.id,
    hash: update.hash,
    date: update.date,
    diff: update.diff,
    data: zip(keys, values)
  }
})

app.get('/diff/:hash', async (request) => {
  const { hash } = request.params
  const update = await db.Update.findOne({
    where: {
      [Op.or]: [
        { id: isNaN(+hash) ? -1 : hash },
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
        [Op.or]: update.diff[key].map(diff => diff.hash)
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
          { id: isNaN(+hash) ? -1 : hash },
          { hash }
        ]
      }
    })
  })
}

db.on('update', async (update) => {
  const hash = update.get('hash')
  const channel = admin.messaging()
  await channel.send({
    data: {
      hash,
      type: 'update'
    },
    topic: 'updates'
  })
})

// NOTE: Check the updates at start and periodically
Promise.resolve().then(async () => {
  await checkUpdates().catch(console.error)
  setInterval(() => checkUpdates().catch(console.error), CACHE_MS)
})

try {
  await app.listen(process.env.PORT ?? 2137)
  app.blipp()

  console.log(`server is running on ${app.server.address().port}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
