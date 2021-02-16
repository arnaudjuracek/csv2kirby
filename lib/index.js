const fs = require('fs-extra')
const path = require('path')
const { parse } = require('papaparse')
const downloadFile = require('download')
const Spinners = require('./utils/spinners')(require('cli-spinners').line)
const Slug = require('./utils/slug')
const { URL } = require('url')

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
  raw = noregexp,
  publish = false,

  verbose = false,
  progress = false,
  porcelain = false
} = {}) {
  if (!input) throw new Error('No input given')
  if (porcelain) verbose = false
  if (porcelain || verbose) progress = false
  if (!progress) Spinners.disable()

  const REGEX = {
    downloadable: new RegExp(download, 'i'),
    array: new RegExp(array, 'i'),
    raw: new RegExp(raw, 'i'),
    ignored: new RegExp(ignore, 'i'),
    arrayDelim: new RegExp(/,\n?/, 'i'),
    multiline: new RegExp(/\n/)
  }

  try {
    !porcelain && console.time('Done')

    const rawContent = fs.readFileSync(input, 'utf8')
    const { data } = await parse(rawContent.trim(), { header: true })

    if (verbose || progress) console.log(`Writing ${data.length} page${data.length > 1 ? 's' : ''} to ${output}…\n`)
    await fs.ensureDir(output)

    let files = []

    // Write all page content

    for (let index = 0; index < data.length; index++) {
      Spinners.log('Writing pages', `${index + 1}/${data.length}`)

      const page = new Page(data[index], index)
      files = files.concat(page.files)

      verbose && console.log('Page →', page.uid)
      porcelain && console.log(page.uid)

      await fs.ensureDir(page.directory)
      await fs.writeFile(path.join(page.directory, blueprint), page.content)
    }

    Spinners.success('Writing pages')

    // Download all files in parallel

    let i = 0
    await Promise.all(files.map(file => {
      return downloadFile(file.url, file.directory, { filename: file.name })
        .then(() => {
          i++
          verbose && console.log('File →', `${i}/${files.length - 1}`, file.name)
          Spinners.log('Writing files', `${i}/${files.length - 1}`)
        })
    }))

    Spinners.success('Writing files')
    Spinners.done()

    !porcelain && console.timeEnd('Done')
  } catch (error) {
    Spinners.done()
    throw error
  }

  function Page (data, index) {
    const TITLE = data[title]
    if (!TITLE) throw new Error(`No '${title}' column found for the title`)

    const uid = Slug.filename(TITLE)
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
        value,
        directory,
        // We pass the url through the URL constructor to ensure correct URL
        // encoding (escaped accentuated characters, etc…)
        url: new URL(value).toString(),
        name: Slug.filename(path.basename(value))
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
      content += Slug.yaml(label) + ': '
      if (REGEX.multiline.test(text)) content += '\n\n'
      content += text
    }

    // Create an optional Raw field if any column name matches the --raw regex.
    // This field is a list of [label, value], with their corresponding values
    // correctly escaped for YAML (using JSON.stringify)
    const raw = Object.entries(data).filter(([label, value]) => REGEX.raw.test(label))
    if (raw && raw.length) {
      content += '\n\n----\n\nRaw:\n'
      for (let [label, value] of raw) {
        // Ensure downloaded files are referenced by they filename, not they url
        const file = files.find(file => file.value === value)
        if (file) value = file.name

        content += '\n-\n'
        content += indent(1) + 'label: ' + JSON.stringify(label)
        content += '\n'
        content += indent(1) + 'value: '
        if (REGEX.multiline.test(value)) {
          content += '>\n'
          content += value.split('\n').map(v => indent(2) + v).join('\n')
        } else {
          content += JSON.stringify(value)
        }
      }
    }

    return {
      uid,
      directory,
      content,
      files
    }
  }
}
