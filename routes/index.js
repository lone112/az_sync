var express = require('express')
var router = express.Router()
const fs = require('fs')
const path = require('path')

const rootDir = process.env.ROOT_DIR || '.'
const baseDir = '/dirs'

const storage = require('../storage')
const storage2 = require('../storage2')
const debug = require('debug')('azsy:http')
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 })

function encodeString (str) {
  let s = Buffer.from(str).toString('base64')
  return s.replace(new RegExp('=', 'g'), '')
}

/* GET home page. */
router.get('/', function (req, res, next) {
  if (storage.hasStorageAccount()) {
    res.redirect(baseDir)
  } else {
    res.redirect('/settings')
  }
})

router.get('/settings', function (req, res, next) {
  res.render('settings', {
    title: 'Settings',
    name: storage.getAccountName(),
    endpoint: storage.getAccountEndpoint(),
  })
})

router.post('/settings', function (req, res, next) {
  let name = req.body.name
  let key = req.body.key
  let endpoint = req.body.endpoint
  storage.setStorageAccount(name, key, endpoint)
  storage2.setStorageAccount(name, key, endpoint)
  res.redirect(baseDir)
})

router.get('/dirs/status', (req, res) => {
  cache.mget(cache.keys(), (err, value) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(200).send(value)
    }
  })
})

router.get('/dirs/url', async function (req, res) {
  storage2.getBlobUrl(storage.containerName, req.query.item).
    then(url => res.status(200).send(url)).
    catch(err => res.status(400).send(err))
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
    fs.readdir(targetDir, { withFileTypes: true }, (err, files) => {
      let vdir = ''
      if (dirRef) {
        vdir = dirRef + '/'
      }

      let uploadingList = cache.keys()

      let items = files.map(it => {
          let id = encodeString(targetDir + it.name)
          return {
            id: id,
            name: it.name,
            isFile: it.isFile(),
            isDir: it.isDirectory(),
            exists: result[vdir + it.name] !== undefined,
            uploading: uploadingList.indexOf(id) !== -1,
          }
        },
      ).sort((a, b) => {
        if (a.isDir !== b.isDir) {
          if (a.isDir) {
            return -1
          } else {
            return 1
          }
        } else {
          if (a.name > b.name) {
            return 1
          } else {
            return -1
          }
        }
      })
      res.render('dirs',
        { items: items, baseDir: baseDir + subDir, home: baseDir })
    })
  }).catch(err => {
    res.render('error', { error: err })
  })

})

router.post('/dirs/upload', async function (req, res) {
  debug(req.body)
  try {
    let dirRef = req.body.item.replace(baseDir, '')
    let item = path.join(rootDir, dirRef)
    debug(item)
    let id = encodeString(item)
    let uploadProgress = (te) => {
      cache.set(id, te)
      console.log(id, te)
    }
    storage.uploadStream(item, undefined, dirRef,
      { progress: uploadProgress }).then(bresp => {
      debug('upload blob resp ', bresp)
    })
    res.status(200).end()
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

module.exports = router
