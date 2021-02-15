# `csv2kirby`
> Generate Kirby content from a CSV file

<br>

## Installation

```console
$ npm install --global arnaudjuracek/csv2kirby
```

## Usage

```
Usage:
  csv2kirby <input.csv>
  csv2kirby <input.csv> --output '/dev/a-kirby-website/content'
  csv2kirby <input.csv> --blueprint <project.txt>
  csv2kirby <input.csv> --title 'TitleColumn'
  csv2kirby <input.csv> --publish
  csv2kirby <input.csv> --download '^http.*(png|jpe?g)$'
  csv2kirby <input.csv> --ignore '(index|pubdate)'
  csv2kirby <input.csv> --raw '(index|pubdate)'

Options:
  -h, --help       Show this screen
  -v, --version    Print the current version

  -o, --output     Define the output directory (default: CWD/content/)
  --progress       Log writing progress
  --verbose        Print detailled informations, disable --progress

  --blueprint      Define the name of the Kirby blueprint (default: 'page.txt')
  --title          Define the column used to get the mandatory page Title
                   (default: 'title')

  --publish        Auto-publish all written pages (order based on their index in
                   the CSV file)

  --download       Define a regex which trigger a file download
  --ignore         Define a regex to ignore some column names
  --raw            Define a regex to store some column in a raw field,
                   referencing their name and the value of the corresponding
                   line

```

## Development

```console
$ git clone https://github.com/arnaudjuracek/csv2kirby
$ cd csv2kirby && npm install
```

## License
[MIT.](https://tldrlegal.com/license/mit-license)

