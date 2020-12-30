#!/usr/bin/env node

const { parser, toConventionalChangelogFormat } = require('..')
const inspect = require('unist-util-inspect')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))

yargs
  .command('$0 <message>', 'output the parsed syntax tree', () => {}, (argv) => {
    console.log(inspect(parser(argv.message)))
  })
  .command('cc <message>', 'output conventional changelog format commit', () => {}, (argv) => {
    const cc = toConventionalChangelogFormat(parser(argv.message))
    console.log('-----')
    console.log(JSON.stringify(cc, null, 2))
  })
  .parse()
