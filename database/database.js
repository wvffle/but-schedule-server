import { createRxDatabase, getRxStoragePouch, addPouchPlugin } from 'rxdb'
import webSqlPouch from 'pouchdb-adapter-node-websql'

import room from './schemas/room.js'
import teacher from './schemas/teacher.js'
import title from './schemas/title.js'
import degree from './schemas/degree.js'
import speciality from './schemas/speciality.js'
import subject from './schemas/subject.js'
import schedule from './schemas/schedule.js'
import update from './schemas/update.js'
import hash from './schemas/hash.js'

addPouchPlugin(webSqlPouch)
export const db = await createRxDatabase({
  name: 'database/store/db',
  storage: getRxStoragePouch('websql')
})

await db.addCollections({
  rooms: {
    schema: room
  },

  teachers: {
    schema: teacher
  },

  titles: {
    schema: title
  },

  degrees: {
    schema: degree
  },

  specialities: {
    schema: speciality
  },

  subjects: {
    schema: subject
  },

  schedules: {
    schema: schedule
  },

  updates: {
    schema: update
  },

  hashes: {
    schema: hash
  },
})