var express = require('express')
var router = express.Router()
const fs = require('fs')
const path = require('path')

const testFolder = 'C:\\CC'
const baseDir = '/dirs'

const storage = require('../storage')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' })
})

router.get('/dirs*', function (req, res, next) {
  let subDir = req.params[0]

  let targetDir = testFolder

  if (subDir && subDir.length > 1) {
    console.log('subDir', subDir)
    targetDir = path.join(testFolder, subDir)
  } else {
    subDir = ''
  }

  fs.readdir(targetDir, { withFileTypes: true }, (err, files) => {
    const items = files.map(it => {
        return {
          name: it.name,
          isFile: it.isFile(),
          isDir: it.isDirectory(),
        }
      },
    )
    res.render('dirs',
      { items: items, baseDir: baseDir + subDir + '/', home: baseDir })
  })

})

module.exports = router
