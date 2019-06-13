'use strict'

var express = require('express')
var router = express.Router()
const { Docker } = require('node-docker-api')
const rootDir = process.env.ROOT_DIR || '.'
const path = require('path')
const fs = require('fs')

const promisifyStream = (stream) => new Promise((resolve, reject) => {
  stream.on('data', (d) => console.log(d.toString()))
  stream.on('end', resolve)
  stream.on('error', reject)
})

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.render('images')
})

router.post('/', function (req, res, next) {
  let strs = req.body.name.split(':')
  let imageName = strs[0]
  let tag = strs[1] || 'latest'

  let filename = req.body.name.replace(':', '-') + '.tar'
  let outputFile = path.join(rootDir, filename)
  docker.image.create({}, { fromImage: imageName, tag: tag }).
    then(stream => promisifyStream(stream)).
    then(() => docker.image.get(imageName).status()).
    then(image => image.get()).
    then(tarStream => {
      let wstream = fs.createWriteStream(outputFile)
      tarStream.pipe(wstream)
      console.log('write file to ', outputFile)
      res.render('images')
    }).catch(error => {
    console.log(error)
    res.render('images')
  })
})

module.exports = router
