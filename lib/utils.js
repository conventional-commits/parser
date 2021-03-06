const visit = require('unist-util-visit')
const visitWithAncestors = require('unist-util-visit-parents')
const NUMBER_REGEX = /^[0-9]+$/

// Converts conventional commit AST into conventional-changelog's
// output format, see: https://www.npmjs.com/package/conventional-commits-parser
function toConventionalChangelogFormat (ast) {
  const cc = {
    body: '',
    subject: '',
    type: '',
    scope: null,
    notes: [],
    references: [],
    mentions: [],
    merge: null,
    revert: null,
    header: '',
    footer: null
  }
  // Separate the body and summary nodes, this simplifies the subsequent
  // tree walking logic:
  let body
  let summary
  visit(ast, ['body', 'summary'], (node) => {
    switch (node.type) {
      case 'body':
        body = node
        break
      case 'summary':
        summary = node
        break
    }
  })

  // <type>, "(", <scope>, ")", ["!"], ":", <whitespace>*, <text>
  visit(summary, (node) => {
    switch (node.type) {
      case 'type':
        cc.type = node.value
        cc.header += node.value
        break
      case 'scope':
        cc.scope = node.value
        cc.header += `(${node.value})`
        break
      case 'breaking-change':
        cc.header += '!'
        break
      case 'text':
        cc.subject = node.value
        cc.header += `: ${node.value}`
        break
      default:
        break
    }
  })

  // [<any body-text except pre-footer>]
  if (body) {
    visit(body, 'text', (node, _i, parent) => {
      // TODO(@bcoe): once we have \n tokens in tree we can drop this:
      if (cc.body !== '') cc.body += '\n'
      cc.body += node.value
    })
  }

  // Extract BREAKING CHANGE notes, regardless of whether they fall in
  // summary, body, or footer:
  const breaking = {
    title: 'BREAKING CHANGE',
    text: '' // "text" will be populated if a BREAKING CHANGE token is parsed.
  }
  visitWithAncestors(ast, ['breaking-change'], (node, ancestors) => {
    let parent = ancestors.pop()
    let startCollecting = false
    switch (parent.type) {
      case 'summary':
        breaking.text = cc.subject
        break
      case 'body':
        breaking.text = ''
        // We treat text from the BREAKING CHANGE marker forward as
        // the breaking change notes:
        visit(parent, ['text', 'breaking-change'], (node) => {
          // TODO(@bcoe): once we have \n tokens in tree we can drop this:
          if (startCollecting && node.type === 'text') {
            if (breaking.text !== '') breaking.text += '\n'
            breaking.text += node.value
          } else if (node.type === 'breaking-change') {
            startCollecting = true
          }
        })
        break
      case 'token':
        parent = ancestors.pop()
        visit(parent, 'text', (node) => {
          breaking.text = node.value
        })
        break
    }
  })
  if (breaking.text !== '') cc.notes.push(breaking)

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
