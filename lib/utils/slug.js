const path = require('path')
const stripAccent = string => string.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

module.exports = {
  filename: function (string) {
    const ext = path.extname(string)
    return (
      stripAccent(string)
        .replace(ext, '')
        // Replace non-matching chars by -
        .replace(/[^a-zA-Z0-9]/g, '-')
        // Dedup successive -
        .replace(/(-+)/g, '-')
        // Remove leading and trailing -
        .replace(/^-|-$/, '') +
        ext
    ).toLowerCase()
  },

  yaml: function (string) {
    return stripAccent(string)
      // Replace leading number and non matching chars by space
      .replace(/^[0-9]+|[^a-zA-Z0-9_]/g, ' ')
      // CamelCase each word
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase())
      // Remove spaces
      .replace(/\s+/g, '')
  }
}
