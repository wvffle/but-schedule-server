import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import arrDiff from 'arr-diff'
import objHash from 'object-hash'
import db from './models/index.js'
import pluralize from 'pluralize'

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
    db.Update.findOne({
      order: [['date', 'DESC']]
    })
  ])

  if (!fetched) {
    console.log('No data fetched from the server')
    return null
  }

  const data = parseData(fetched, lastUpdate?.hash)
  const diff = calculateDiff(lastUpdate?.data ?? {}, data)

  // NOTE: Diff is empty, lets return the latest update
  if (!Object.values(diff).reduce((a, arr) => a + arr.length, 0)) {
    console.log('No new diff found')
    return lastUpdate
  }

  console.log('New diff found')

  const results = await Promise.all([
    db.Room.bulkCreate(data.rooms, { ignoreDuplicates: true }),
    db.Title.bulkCreate(data.titles, { ignoreDuplicates: true }),
    db.Degree.bulkCreate(data.degrees, { ignoreDuplicates: true }),
    db.Subject.bulkCreate(data.subjects, { ignoreDuplicates: true }),
    db.Speciality.bulkCreate(data.specialities, { ignoreDuplicates: true }),
  ])

  const hashes = {}
  for (const models of results) {
    for (const model of models) {
      hashes[model.get('hash')] = model.get('id')
    }
  }

  // NOTE: Let's update the teachers title hash to an id
  data.teachers = data.teachers.map(teacher => {
    teacher.title = hashes[teacher.title] ?? null
    return teacher
  })

  // NOTE: Teachers depend on titles and schedules depend on teachers, thus they're inserted synchronously
  const teachers = await db.Teacher.bulkCreate(data.teachers, { ignoreDuplicates: true })
  for (const teacher of teachers) {
    hashes[teacher.get('hash')] = teacher.get('id')
  }

  // NOTE: Let's update the schedule attributes hashes to ids
  data.schedules = data.schedules.map(schedule => {
    for (const attr of ['teacher', 'room', 'subject', 'degree', 'speciality']) {
      schedule[attr] = hashes[schedule[attr]] ?? null
    }

    return schedule
  })

  await db.Schedule.bulkCreate(data.schedules, { ignoreDuplicates: true })
  console.log('inserted new data')

  const result = await db.Update.create({
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
    date: new Date(),
    diff
  })

  db.emit('update', result)

  console.log('inserted an update')
  return result
}