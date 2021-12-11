export default {
  title: 'teacher schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  properties: {
    hash: { type: 'string' },
    name: { type: 'string' },
    surname: { type: 'string' },
    initials: { type: 'string' },
    title: { ref: 'titles', type: 'string' },
  }
}
