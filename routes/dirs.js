const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 })
const debug = require('debug')('azsy:http')
const storage = require('../storage')
const storage2 = require('../storage2')
const baseDir = '/dirs/list'
const rootDir = process.env.ROOT_DIR || '.'

function encodeString (str) {
  let s = Buffer.from(str).toString('base64')
  return s.replace(new RegExp('=', 'g'), '')
}

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource')
})

router.get('/status', (req, res) => {
  cache.mget(cache.keys(), (err, value) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(200).send(value)
    }
  })
})

router.get('/url', async function (req, res) {
  storage2.getBlobUrl(storage.containerName, req.query.item).
    then(url => res.status(200).send(url)).
    catch(err => res.status(400).send(err))
})

router.get('/list*', function (req, res) {
  let subDir = req.params[0] || '/'

  if (subDir.length > 1) {
    if (!subDir.startsWith('/')) {
      subDir = '/'
    } else if (!subDir.endsWith('/')) {
      subDir = subDir + '/'
    }
  }

  let targetDir = path.join(rootDir, subDir)

  let dirRef = undefined
  if (subDir.length > 1) {
    dirRef = subDir.substring(1)
  }

  debug('subDir', subDir)
  debug('targetDir', targetDir)
  debug('dirRef', dirRef)

  storage.listBlobs(dirRef).then(result => {
    return new Promise((resolve) => {
      fs.readdir(targetDir, { withFileTypes: true }, (err, files) => {
        let vdir = ''
        if (dirRef) {
          vdir = dirRef
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
        resolve(items)
      })
    })
  }).then(items => {
    res.render('dirs',
      { items: items, baseDir: baseDir + subDir, home: baseDir })
  }).catch(err => {
    res.render('error', { error: err })
  })

})

router.post('/upload', async function (req, res) {
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
      if (bresp['errorCode'] === undefined) {
        cache.del(id)
      }
    })
    res.status(200).end()
  } catch (err) {
    console.log(err)
    res.status(400).send(err)
  }
})

module.exports = router
