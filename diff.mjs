import arrDiff from 'arr-diff'

export const diff = (lhs, rhs, key = 'value') => {
  const added = arrDiff(rhs, lhs)
  const removed = arrDiff(lhs, rhs)

  return [
    ...added.map(value => ({ type: '+', [key]: value })),
    ...removed.map(value => ({ type: '-', [key]: value }))
  ]
}

