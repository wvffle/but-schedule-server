export default {
  title: 'update schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  indexes: ['date'],
  properties: {
    hash: { type: 'string' },
    date: { type: 'number' },
    data: {
      type: 'object',
      properties: {
        degrees: {
          type: 'array',
          items: { type: 'string', ref: 'degrees' }
        },
        rooms: {
          type: 'array',
          items: { type: 'string', ref: 'rooms' }
        },
        schedules: {
          type: 'array',
          items: { type: 'string', ref: 'schedules' }
        },
        specialities: {
          type: 'array',
          items: { type: 'string', ref: 'specialities' }
        },
        subjects: {
          type: 'array',
          items: { type: 'string', ref: 'subjects' }
        },
        teachers: {
          type: 'array',
          items: { type: 'string', ref: 'teachers' }
        },
        titles: {
          type: 'array',
          items: { type: 'string', ref: 'titles' }
        }
      }
    },
    diff: {
      type: 'object',
      properties: {
        degrees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              degree: { ref: 'degrees', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        rooms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              room: { ref: 'rooms', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        schedules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              schedule: { ref: 'schedules', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        specialities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              speciality: { ref: 'specialities', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        subjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject: { ref: 'subjects', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        teachers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              teacher: { ref: 'teachers', type: 'string' },
              type: { type: 'string' }
            }
          }
        },
        titles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { ref: 'titles', type: 'string' },
              type: { type: 'string' }
            }
          }
        }
      }
    }
  }
}
