#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const { parse } = require('papaparse')
const download = require('download')
const spinners = require('./utils/spinners')(require('cli-spinners').line)
const { URL } = require('url')
const slugify = require('slugify')

const BLUEPRINT = require('./blueprint.json')

const [input, output] = process.argv.slice(2)
if (!input) {
  console.error('Error: input file not found')
  process.exit(1)
}

const OUTPUT_DIRECTORY = path.join(process.cwd(), output || 'content')

;(async () => {
  try {
    // Parsing CSV
    const csv = path.join(process.cwd(), input)
    const raw = fs.readFileSync(csv, 'utf8')
    const { data } = await parse(raw.trim(), { header: true })

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

  const downloads = []
  const spinner = spinners.add(UID)
  const groupName = BLUEPRINT.groupBy && [...BLUEPRINT.groupBy].map(key => project[key]).filter(Boolean)[0]
  const groupDirectory = groupName && path.join(OUTPUT_DIRECTORY, slugify(groupName).toLowerCase())
  const directory = path.join(groupDirectory || OUTPUT_DIRECTORY, UID)

  spinner.log(`preparing ${UID}…`)

  let content = `Title: ${UID}\n\n----\n\nRaw:\n`

  // Loop through all parsed columns
  Object.entries(project).forEach(([label, value]) => {
    const file = value && value.includes(BLUEPRINT.fileSource) && {
      filename: `${downloads.length}_${path.basename(value)}`,
      // Passing the url through the URL constructor to ensure correct URL
      // encoding (escaped accentuated characters, etc…)
      url: new URL(value).toString()
    }

    content += '\n'
    content += YAMLStructureItem({ label, value: file ? file.filename : value })

    if (file) downloads.push(file)
  })

  spinner.log(`creating ${UID}…`)

  if (groupDirectory) {
    await fs.ensureDir(groupDirectory)
    await fs.writeFile(path.join(groupDirectory, BLUEPRINT.groupName), `Title: ${groupName}`)
  }

  await fs.ensureDir(directory)

  spinner.log(`writing content…`)

  await fs.writeFile(path.join(directory, BLUEPRINT.name), content)

  for (let index = 0; index < downloads.length; index++) {
    const { filename, url } = downloads[index]
    spinner.log(`downloading (${index + 1}/${downloads.length})…`)
    await download(url, directory, { filename })
  }

  spinner.success('done.')
}

function YAMLStructureItem (o, { indentation = '  ', level = 1 } = {}) {
  let content = '-'
  Object.entries(o).forEach(([ key, value ]) => {
    content += '\n'
    content += indentation.repeat(level) + key + ': |\n'
    if (!value) return
    content += value.split('\n').map(line => indentation.repeat(level + 1) + line).join('\n')
  })

  return content
}
