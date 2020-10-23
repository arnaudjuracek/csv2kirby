#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const { parse } = require('papaparse')
const download = require('download')
const spinners = require('./utils/spinners')(require('cli-spinners').line)
const capitalize = require('capitalize')
const { URL } = require('url')

const [input, output] = process.argv.slice(2)
if (!input) {
  console.error('Error: input file not found')
  process.exit(1)
}

const OPTIONS = {
  outputDirectory: path.join(process.cwd(), output || 'content'),
  templateName: 'project.txt',
  fieldSeparator: '\n\n----\n\n',
  template: {
    'submit_date': 'Submit Date (UTC)',
    'networkd_id': 'Network ID',

    'lastname': 'Nom',
    'firstname': 'Prénom',
    'structure': 'Structure',
    'email': 'Adresse email',
    'phone': 'Numéro de téléphone',
    'profile_picture': 'Photographie du candidat',

    'street': 'N° et nom de la rue',
    'zipcode': 'Code postal',
    'city': 'Nom de la ville',

    'category': 'Sélection de la catégorie',

    'picture_1': 'Photo n°1',
    'picture_1_title': 'Titre de la photo n°1',
    'picture_1_legend': 'Légende de la photo n°1',
    'picture_1_credits': 'Crédits de la photo n°1',

    'picture_2': 'Photo n°2',
    'picture_2_title': 'Titre de la photo n°2',
    'picture_2_legend': 'Légende de la photo n°2',
    'picture_2_credits': 'Crédits de la photo n°2',

    'picture_3': 'Photo n°3',
    'picture_3_title': 'Titre de la photo n°3',
    'picture_3_legend': 'Légende de la photo n°3',
    'picture_3_credits': 'Crédits de la photo n°3',

    'document_1': 'Document graphique n°1',
    'document_1_title': 'Titre du document n°1',
    'document_1_legend': 'Légende du document n°1',
    'document_1_credits': 'Crédits du document n°1',

    'document_2': 'Document graphique n°2',
    'document_2_title': 'Titre du document n°2',
    'document_2_legend': 'Légende du document n°2',
    'document_2_credits': 'Crédits du document n°2',

    'document_3': 'Document graphique n°3',
    'document_3_title': 'Titre du document n°3',
    'document_3_legend': 'Légende du document n°3',
    'document_3_credits': 'Crédits du document n°3'
  },
  fileKeys: [
    'Photographie du candidat',
    'Photocopie du diplôme ou attestation faisant foi de l’établissement',
    'Photo n°1',
    'Photo n°2',
    'Photo n°3',
    'Document graphique n°1',
    'Document graphique n°2',
    'Document graphique n°3'
  ].map(k => k.toLowerCase())
}

;(async () => {
  try {
    // Parsing CSV
    const csv = path.join(process.cwd(), input)
    const raw = fs.readFileSync(csv, 'utf8')
    const { data } = await parse(raw.trim(), {
      header: true,
      transformHeader: str => str.trim().toLowerCase()
    })

    console.log(`Writing ${data.length} project${data.length > 1 ? 's' : ''} to ${OPTIONS.outputDirectory}: \n`)

    // Writing Kirby files
    await fs.ensureDir(OPTIONS.outputDirectory)
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

  // Create directory
  spinner.log(`creating ${UID}`)
  const dir = path.join(OPTIONS.outputDirectory, UID)
  await fs.ensureDir(dir)

  // Download and write attached files
  const urls = OPTIONS.fileKeys.map(k => project[k]).filter(Boolean)
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index]
    spinner.log(`downloading files (${index + 1}/${urls.length})…`)
    // Passing the url through the URL constructor to ensure correct URL
    // encoding (escaped accentuated characters, etc…)
    await download(new URL(url).toString(), dir, { filename: path.basename(url) })
  }

  // Write project file inside project directory
  spinner.log('writing content…')
  let content = `Title: ${UID}` + OPTIONS.fieldSeparator
  for (let [ field, key ] of Object.entries(OPTIONS.template)) {
    key = key.toLowerCase()
    const value = project[key]
    const isFilePointer = value && OPTIONS.fileKeys.includes(key)
    const isMultiline = value && value.split('\n').length > 1

    content += capitalize(field) + ':'
    content += isMultiline ? '\n\n' : ' '
    content += isFilePointer ? path.basename(value) : value
    content += OPTIONS.fieldSeparator
  }
  await fs.writeFile(path.join(dir, OPTIONS.templateName), content, 'utf8')

  spinner.success('done.')
}
