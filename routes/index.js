var express = require('express')
var router = express.Router()
const fs = require('fs')
const path = require('path')

const rootDir = 'C:\\CC'
const baseDir = '/dirs'

const storage = require('../storage')
const debug = require('debug')('azsy:http')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' })
})

router.get('/dirs*', function (req, res, next) {
  let subDir = req.params[0] || '/'

  if (subDir.length > 1 && !subDir.startsWith('/')) {
    subDir = '/'
  }

  let targetDir = path.join(rootDir, subDir)

  let dirRef = undefined
  if (subDir.length > 1) {
    dirRef = subDir.substring(1)
  }

  if (!subDir.endsWith('/')) {
    subDir = subDir + '/'
  }

  debug('subDir', subDir)
  debug('targetDir', targetDir)
  debug('dirRef', dirRef)

  storage.listBlobs(dirRef).then(result => {
    debug(result)
    fs.readdir(targetDir, { withFileTypes: true }, (err, files) => {
      let vdir = ''
      if (dirRef) {
        vdir = dirRef + '/'
      }

      let items = files.map(it => {
          return {
            name: it.name,
            isFile: it.isFile(),
            isDir: it.isDirectory(),
            exists: result.includes(vdir + it.name),
          }
        },
      )
      res.render('dirs',
        { items: items, baseDir: baseDir + subDir, home: baseDir })
    })
  })

})

router.post('/dirs/upload', async function (req, res) {
  debug(req.body)
  try {
    let dirRef = req.body.item.replace(baseDir, '')
    let item = path.join(rootDir, dirRef)
    debug(item)
    await storage.uploadStream(item, undefined, dirRef)
    res.status(200).end()
  } catch (err) {
    res.status(400).send(err)
  }
})

module.exports = router
