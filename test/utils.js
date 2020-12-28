const { describe, it } = require('mocha')
const assert = require('assert')
const { parser, toConventionalChangelogFormat } = require('../')

describe('utils', () => {
  describe('toConventionalChangelogFormat', () => {
    it('it handles commit with header', () => {
      let parsed = toConventionalChangelogFormat(parser('foo: bar'))
      assert.strictEqual(parsed.type, 'foo')
      assert.strictEqual(parsed.subject, 'bar')
      parsed = toConventionalChangelogFormat(parser('foo(parser): hello world'))
      assert.strictEqual(parsed.type, 'foo')
      assert.strictEqual(parsed.scope, 'parser')
      assert.strictEqual(parsed.subject, 'hello world')
    })
    it('it handles commit with header and body', () => {
      const parsed = toConventionalChangelogFormat(parser('foo: bar\n\nthe body of commit\nsecond line'))
      assert.strictEqual(parsed.body, 'the body of commit\nsecond line')
    })
    it('extracts BREAKING CHANGE from header', () => {
      const parsed = toConventionalChangelogFormat(parser('foo!: hello world'))
      assert.strictEqual(parsed.notes.length, 1)
      const note = parsed.notes[0]
      assert.strictEqual(note.title, 'BREAKING CHANGE')
      assert.strictEqual(note.text, 'hello world')
    })
    it('populates references entry from footer', () => {
      const parsed = toConventionalChangelogFormat(parser('foo: summary\n\nRefs #34'))
      assert.strictEqual(parsed.references.length, 1)
      const reference = parsed.references[0]
      assert.strictEqual(reference.issue, '34')
    })
    it('populates reference with ":" separator', () => {
      const parsed = toConventionalChangelogFormat(parser('foo: summary\n\nRefs: #34'))
      assert.strictEqual(parsed.references.length, 1)
      const reference = parsed.references[0]
      assert.strictEqual(reference.issue, '34')
    })
    it('does not populate reference, if it is non-numeric', () => {
      const parsed = toConventionalChangelogFormat(parser('foo: summary\n\nRefs #batman'))
      assert.strictEqual(parsed.references.length, 0)
    })
  })
})
