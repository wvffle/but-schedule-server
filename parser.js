import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import arrDiff from 'arr-diff'
import objHash from 'object-hash'
import { db } from './database/database.js'
import pluralize from 'pluralize'

import room from './database/schemas/room.js'
import teacher from './database/schemas/teacher.js'
import title from './database/schemas/title.js'
import degree from './database/schemas/degree.js'
import speciality from './database/schemas/speciality.js'
import subject from './database/schemas/subject.js'
import schedule from './database/schemas/schedule.js'
import update from './database/schemas/update.js'

const fix = (object, { properties }) => {
  for (const key in object) {
    if (key in properties) {
      if (properties[key].type === 'string') {
        object[key] = (object[key] ?? '').toString()
      }
    } else {
      delete object[key]
    }
  }

  return object
}

const XML_URL = 'https://degra.wi.pb.edu.pl/rozklady/webservices.php'
const KEY_MAP = {
  tabela_sale: 'rooms',
  tabela_nauczyciele: 'teachers',
  tabela_tytuly: 'titles',
  tabela_studia: 'degrees',
  tabela_specjalnosci: 'specialities',
  tabela_przedmioty: 'subjects',
  tabela_rozklad: 'schedules',
  DZIEN: 'day',
  GODZ: 'hour',
  ILOSC: 'intervals',
  TYG: 'weekFlags',
  ID_NAUCZ: 'teacher',
  ID_SALA: 'room',
  ID_PRZ: 'subject',
  RODZ: 'type',
  GRUPA: 'group',
  ID_ST: 'degree',
  SEM: 'semester',
  ID_SPEC: 'speciality',
  ID: 'id',
  NAZWA: 'name',
  IMIE: 'name',
  NAZW: 'surname',
  IM_SK: 'initials',
  ID_TYT: 'title',
  NAZ_SK: 'shortName'
}

const diff = (lhs, rhs, key = 'value') => {
  const added = arrDiff(rhs, lhs)
  const removed = arrDiff(lhs, rhs)

  return [
    ...added.map(value => ({ type: '+', [key]: value })),
    ...removed.map(value => ({ type: '-', [key]: value }))
  ]
}

export const fetchSchedule = async () => {
  const { data: xml } = await axios.get(XML_URL)
  const parser = new XMLParser()
  const data = parser.parse(xml)

  if (!('conversation' in data)) {
    console.error('There was a problem with your XML file')
    return false
  }

  return data.conversation
}

const generateHashes = array => {
  return array
    .map(schedule => ({
      hash: objHash(schedule),
      ...schedule
    }))
    .sort((a, b) => a.hash.localeCompare(b.hash))
}

const parseData = (data, lastHash = '', isDeep = false) => {
  const res = {}

  for (const [key, value] of Object.entries(data)) {
    res[key in KEY_MAP ? KEY_MAP[key] : key] = Array.isArray(value)
      ? value.map(v => parseData(v, lastHash, true))
      : (typeof value === 'object' ? parseData(value, lastHash, true) : value)
  }

  if (!isDeep) {
    const idMap = { teachers: {} }
    for (const key of ['rooms', 'titles', 'degrees', 'subjects', 'specialities']) {
      idMap[key] = {}
      res[key] = generateHashes(res[key])

      for (const entry of res[key]) {
        if ('id' in entry) {
          idMap[key][entry.id] = entry.hash
        }
      }
    }

    const replaceIds = object => {
      for (const plural in idMap) {
        const key = pluralize(plural, 1)
        if (key in object) {
          object[key] = idMap[plural][object[key]] ?? null
        }
      }

      return object
    }

    res.teachers = generateHashes(res.teachers.map(replaceIds))
    for (const entry of res.teachers) {
      idMap.teachers[entry.id] = entry.hash
    }

    res.schedules = generateHashes(res.schedules.map(replaceIds).map(schedule => {
      schedule.weekFlags = 3 - schedule.weekFlags
      return schedule
    }))

    res.lastHash = lastHash
    res.hash = objHash(res)
  }

  return res
}

const calculateDiff = (a, b) => {
  const diffs = {}
  for (const key of ['rooms', 'titles', 'degrees', 'subjects', 'specialities', 'teachers', 'schedules']) {
    const data = { lhs: a[key] ?? [], rhs: b[key] ?? [] }
    const lhs = data.lhs.map(entry => entry?.hash ?? entry)
    const rhs = data.rhs.map(entry => entry?.hash ?? entry)

    diffs[key] = diff(lhs, rhs, pluralize(key, 1))
  }

  return diffs
}

export const checkUpdates = async () => {
  const [fetched, lastUpdate] = await Promise.all([
    fetchSchedule(),
    db.updates.findOne().sort({ date: 'desc' }).exec()
  ])

  if (!fetched) {
    return null
  }

  const data = parseData(fetched, lastUpdate?.hash)
  const diff = calculateDiff(lastUpdate?.data ?? {}, data)

  // NOTE: Diff is empty, lets return the latest update
  if (!Object.values(diff).reduce((a, arr) => a + arr.length, 0)) {
    return lastUpdate
  }

  const results = await Promise.all([
    db.rooms.bulkInsert(data.rooms.map(value => fix(value, room))),
    db.titles.bulkInsert(data.titles.map(value => fix(value, title))),
    db.degrees.bulkInsert(data.degrees.map(value => fix(value, degree))),
    db.subjects.bulkInsert(data.subjects.map(value => fix(value, subject))),
    db.specialities.bulkInsert(data.specialities.map(value => fix(value, speciality))),
  ])

  // NOTE: teachers depend on titles and schedules depend on teachers, thus they're inserted synchronously
  results.push(await db.teachers.bulkInsert(data.teachers.map(value => fix(value, teacher))))
  results.push(await db.schedules.bulkInsert(data.schedules.map(value => fix(value, schedule))))

  // NOTE: Let's ignore errors about elements already existing
  const errors = results
    .reduce((acc, { error }) => [...acc, ...error], [])
    .filter(({ status }) => status !== 409)

  if (errors.length) {
    console.error(errors)
  }

  return db.updates.insert({
    hash: data.hash,
    data: {
      rooms: data.rooms.map(({ hash }) => hash),
      titles: data.titles.map(({ hash }) => hash),
      degrees: data.degrees.map(({ hash }) => hash),
      subjects: data.subjects.map(({ hash }) => hash),
      teachers: data.teachers.map(({ hash }) => hash),
      schedules: data.schedules.map(({ hash }) => hash),
      specialities: data.specialities.map(({ hash }) => hash),
    },
    date: +new Date(),
    diff
  })
}