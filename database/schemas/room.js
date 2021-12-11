export default {
  title: 'room schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  properties: {
    hash: { type: 'string' },
    name: { type: 'string' }
  }
}