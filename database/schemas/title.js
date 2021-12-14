export default {
  title: 'title schema',
  version: 0,
  primaryKey: 'hash',
  type: 'object',
  keyCompression: true,
  properties: {
    id: { type: 'number' },
    hash: { type: 'string' },
    name: { type: 'string' },
  }
}
