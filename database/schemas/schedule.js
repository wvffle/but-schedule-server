export default {
  title: 'schedule schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  properties: {
    hash: { type: 'string' },
    day: { type: 'number', minimum: 1, maximum: 7 },
    hour: { type: 'number', minimum: 1 },
    intervals: { type: 'number', minimum: 1 },
    weekFlags: { type: 'number' },
    teacher: { ref: 'teachers', type: 'string' },
    room: { ref: 'rooms', type: 'string' },
    subject: { ref: 'subjects', type: 'string' },
    type: { type: 'string' },
    group: { type: 'number' },
    degree: { ref: 'degrees', type: 'string' },
    semester: { type: 'number' },
    speciality: { ref: 'specialities', type: 'string' }
  }
}
