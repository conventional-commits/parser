const visit = require('unist-util-visit')
const NUMBER_REGEX = /^[0-9]+$/

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
  visit(ast, ['body', 'summary'], (node) => {
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

  // Populates references array from footers:
  // references: [{
  //    action: 'Closes',
  //    owner: null,
  //    repository: null,
  //    issue: '1', raw: '#1',
  //    prefix: '#'
  // }]
  visit(ast, ['footer'], (node) => {
    const reference = {
      prefix: '#'
    }
    let hasRefSepartor = false
    visit(node, ['type', 'separator', 'text'], (node) => {
      switch (node.type) {
        case 'type':
          // refs, closes, etc:
          // TODO(@bcoe): conventional-changelog does not currently use
          // "reference.action" in its templates:
          reference.action = node.value
          break
        case 'separator':
          // Footer of the form "Refs #99":
          if (node.value.includes('#')) hasRefSepartor = true
          break
        case 'text':
          // Footer of the form "Refs: #99"
          if (node.value.charAt(0) === '#') {
            hasRefSepartor = true
            reference.issue = node.value.substring(1)
          // TODO(@bcoe): what about references like "Refs: #99, #102"?
          } else {
            reference.issue = node.value
          }
          break
        default:
          break
      }
    })
    // TODO(@bcoe): how should references like "Refs: v8:8940" work.
    if (hasRefSepartor && reference.issue.match(NUMBER_REGEX)) {
      cc.references.push(reference)
    }
  })

  return cc
}

module.exports = {
  toConventionalChangelogFormat
}
