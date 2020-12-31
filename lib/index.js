const fs = require('fs-extra')
const path = require('path')
const { parse } = require('papaparse')
const downloadFile = require('download')
const Spinners = require('./utils/spinners')(require('cli-spinners').line)
const { URL } = require('url')
const slugify = require('slugify')

const noregexp = /(?!)/ // Never matching regex
const indent = (depth = 0) => '  '.repeat(depth)

module.exports = async function ({
  input = null,
  output = path.join(process.cwd(), 'content'),
  title = 'title',
  blueprint = 'page.txt',
  download = noregexp,
  ignore = noregexp,
  array = noregexp,
  publish = false,
  progress = false
} = {}) {
  if (!input) throw new Error('No input given')
  if (!progress) Spinners.disable()

  const REGEX = {
    downloadable: new RegExp(download, 'i'),
    array: new RegExp(array, 'i'),
    ignored: new RegExp(ignore, 'i'),
    arrayDelim: new RegExp(/,\n?/, 'i'),
    multiline: new RegExp(/\n/)
  }

  try {
    console.time('Done')

    const raw = fs.readFileSync(input, 'utf8')
    const { data } = await parse(raw.trim(), { header: true })

    console.log(`Writing ${data.length} page${data.length > 1 ? 's' : ''} to ${output}…\n`)
    await fs.ensureDir(output)

    let files = []

    // Write all page content

    for (let index = 0; index < data.length; index++) {
      Spinners.log('Writing pages', `${index + 1}/${data.length}`)

      const page = new Page(data[index], index)
      files = files.concat(page.files)

      await fs.ensureDir(page.directory)
      await fs.writeFile(path.join(page.directory, blueprint), page.content)
    }

    Spinners.success('Writing pages')

    // Download all files in parallel

    let i = 0
    Spinners.log('Writing files', `${++i}/${files.length}`)
    await Promise.all(files.map(file => {
      return downloadFile(file.url, file.directory, { filename: file.name })
        .then(() => {
          Spinners.log('Writing files', `${i++}/${files.length}`)
        })
    }))

    Spinners.success('Writing files')
    Spinners.done()

    console.timeEnd('Done')
  } catch (error) {
    Spinners.done()
    throw error
  }

  function Page (data, index) {
    const TITLE = data[title]
    if (!TITLE) throw new Error(`No '${title}' column found for the title`)

    const uid = slugify(TITLE, { lower: true })
    const directory = path.join(output, (publish ? `${index + 1}_${uid}` : uid))
    const files = []

    function handleEntry (label, value, depth = 0) {
      if (REGEX.array.test(label)) {
        return value.split(REGEX.arrayDelim)
          .filter(v => Boolean(v) && !REGEX.arrayDelim.test(v))
          .map(v => indent(depth) + '- ' + handleEntry(null, v, depth + 1))
          .join('\n')
      }

      const file = REGEX.downloadable.test(value) && {
        directory,
        // We pass the url through the URL constructor to ensure correct URL
        // encoding (escaped accentuated characters, etc…)
        url: new URL(value).toString(),
        name: `${files.length}_${path.basename(value)}`
      }

      if (file) files.push(file)
      return file ? file.name : value.trim()
    }

    // Loop through all parsed columns and populate content

    let content = `Title: ${TITLE}`
    for (const [label, value] of Object.entries(data)) {
      if (REGEX.ignored.test(label)) continue

      const text = handleEntry(label, value)
      content += '\n\n----\n\n'
      content += slugify(label) + ': '
      if (REGEX.multiline.test(text)) content += '\n\n'
      content += text
    }

    return {
      uid,
      directory,
      content,
      files
    }
  }
}
