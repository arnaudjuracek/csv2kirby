#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const { parse } = require('papaparse')
const download = require('download')
const spinners = require('./utils/spinners')(require('cli-spinners').line)
const capitalize = require('capitalize')
const { URL } = require('url')
const slugify = require('slugify')

const BLUEPRINT = require('./blueprint.json')

const [input, output] = process.argv.slice(2)
if (!input) {
  console.error('Error: input file not found')
  process.exit(1)
}

const OUTPUT_DIRECTORY = path.join(process.cwd(), output || 'content')
const FIELD_SEPARATOR = '\n\n----\n\n'

BLUEPRINT.files = BLUEPRINT.files.map(key => key.toUpperCase())

;(async () => {
  try {
    // Parsing CSV
    const csv = path.join(process.cwd(), input)
    const raw = fs.readFileSync(csv, 'utf8')
    const { data } = await parse(raw.trim(), {
      header: true,
      transformHeader: str => str.trim().toUpperCase()
    })

    console.log(`Writing ${data.length} project${data.length > 1 ? 's' : ''} to ${OUTPUT_DIRECTORY}: \n`)

    // Writing Kirby files
    await fs.ensureDir(OUTPUT_DIRECTORY)
    await Promise.all(data.map(write))
    spinners.done()
  } catch (error) {
    spinners.done()
    console.error(error)
    process.exit(1)
  }
})()

async function write (project) {
  const UID = project['#'] || project['Token']
  if (!UID) return

  const spinner = spinners.add(UID)

  // Find sub-group
  const group = BLUEPRINT.groupBy && [...BLUEPRINT.groupBy].map(key => {
    return project[key.toUpperCase()]
  }).filter(Boolean)[0]

  // Create directory
  spinner.log(`creating ${UID}`)
  const dir = group
    ? path.join(OUTPUT_DIRECTORY, slugify(group.toLowerCase()), UID)
    : path.join(OUTPUT_DIRECTORY, UID)
  await fs.ensureDir(dir)

  // Download and write attached files
  const urls = BLUEPRINT.files.map(key => project[key]).filter(Boolean)
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index]
    spinner.log(`downloading files (${index + 1}/${urls.length})…`)
    // Passing the url through the URL constructor to ensure correct URL
    // encoding (escaped accentuated characters, etc…)
    await download(new URL(url).toString(), dir, { filename: path.basename(url) })
  }

  // Write project file inside project directory
  spinner.log('writing content…')
  let content = `Title: ${UID}` + FIELD_SEPARATOR
  for (let [ field, key ] of Object.entries(BLUEPRINT.fields)) {
    key = key.toUpperCase()
    const value = project[key]
    const isFilePointer = value && BLUEPRINT.files.includes(key)
    const isMultiline = value && value.split('\n').length > 1

    content += capitalize(field) + ':'
    content += isMultiline ? '\n\n' : ' '
    content += isFilePointer ? path.basename(value) : value
    content += FIELD_SEPARATOR
  }
  await fs.writeFile(path.join(dir, BLUEPRINT.name), content, 'utf8')

  spinner.success('done.')
}
