#!/usr/bin/env node

const { parser } = require('..')
const inspect = require('unist-util-inspect')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))

yargs
  .command('$0 <message>', 'Output the parsed syntax tree', () => {}, (argv) => {
    console.log(inspect(parser(argv.message)))
  })
  .parse()
