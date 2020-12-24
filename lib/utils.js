const visit = require('unist-util-visit')
const parser = require('./parser')

// Converts conventional commit AST into conventional-changelog's
// output format, see: https://www.npmjs.com/package/conventional-commits-parser
function toConventionalChangelogFormat (ast) {
  const cc = {
    body: null,
    notes: [],
    references: [],
    mentions: [],
    merge: null,
    revert: null
  }
  let breaking
  let body
  let summary
  // Separate the body and summary nodes, this simplifies the subsequent
  // tree walking logic:
  visit(ast, (node) => {
    if (node.type === 'summary' || node.type === 'body') return true
  }, (node) => {
    switch (node.type) {
      case 'body':
        body = node
        break
      case 'summary':
        summary = node
        break
      default:
        break
    }
  })

  visit(summary, () => true, (node) => {
    switch (node.type) {
      case 'type':
        cc.type = node.value
        break
      case 'scope':
        cc.scope = node.value
        break
      case 'text':
        cc.subject = node.value
        break
      case 'breaking-change':
        breaking = {
          title: 'BREAKING CHANGE'
          // "text" node should be added with subject after walk.
        }
        break
      default:
        break
    }
  })
  // The header contains the recombined components of the summary:
  cc.header = `${cc.type}${cc.scope ? `(${cc.scope})` : ''}${breaking ? '!' : ''}: ${cc.subject}`

  if (body) {
    let text = ''
    visit(body, 'text', (node, _i, parent) => {
      if (parent.type !== 'body') return
      if (text !== '') text += '\n'
      text += node.value
    })
    if (text !== '') cc.body = text
  }

  // A breaking change note was found either in the body, the header, or
  // in one of the footers:
  // TODO(bcoe): if we refactor the grammar slightly, so that footer is a
  // direct parent of `breaking-change`, the logic for extracting a breaking
  // change would be easier.
  if (breaking) {
    if (!breaking.text) breaking.text = cc.subject
    cc.notes.push(breaking)
  }

  return cc
}

const ast = parser('feat(hello world)!: this is an awesome feature\n\nthis is the body text\n\nsecond line of body\nmoar body')
toConventionalChangelogFormat(ast)

module.exports = {
  toConventionalChangelogFormat
}
