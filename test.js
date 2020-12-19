const assert = require('assert')
const { describe, it } = require('mocha')
const parser = require('./')

describe('parser', () => {
  describe('<type> ":" <text>', () => {
    it('parses summary with no scope', () => {
      const message = parser('fix: a really weird bug')
      assert.strictEqual(message.type, 'message')
      const summary = message.children[0]
      assert.strictEqual(summary.type, 'summary')
      const type = summary.children[0]
      assert.strictEqual(type.type, 'type')
      assert.strictEqual(type.value, 'fix')
      const text = summary.children[1]
      assert.strictEqual(text.type, 'text')
      assert.strictEqual(text.value, 'a really weird bug')
    })
    it('parses summary with scope', () => {
      const message = parser('feat(parser): add support for scopes')
      assert.strictEqual(message.type, 'message')
      const summary = message.children[0]
      assert.strictEqual(summary.type, 'summary')
      const type = summary.children[0]
      assert.strictEqual(type.type, 'type')
      assert.strictEqual(type.value, 'feat')
      const scope = summary.children[1]
      assert.strictEqual(scope.type, 'scope')
      assert.strictEqual(scope.value, 'parser')
      const text = summary.children[2]
      assert.strictEqual(text.type, 'text')
      assert.strictEqual(text.value, 'add support for scopes')
    })
  })
  // TODO: figure out how we handle '!' character, since it can be tied
  // find out from wooorm if node can both have children and have a value.
})
