var express = require('express')
var router = express.Router()


const storage = require('../storage')
const storage2 = require('../storage2')
const debug = require('debug')('azsy:http')

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
module.exports = router
