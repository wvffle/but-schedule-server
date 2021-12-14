export default {
  title: 'hash schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  indexes: ['id'],
  properties: {
    hash: { type: 'string' },
    id: { type: 'number' }
  }
}
