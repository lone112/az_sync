const fs = require('fs')
const path = require('path')

const {
  Aborter,
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
  SharedKeyCredential,
  AnonymousCredential,
  TokenCredential,
  uploadStreamToBlockBlob,
} = require('@azure/storage-blob')

const debug = require('debug')('azsy:storage')

const ONE_MEGABYTE = 1024 * 1024
const FOUR_MEGABYTES = 1 * ONE_MEGABYTE
const ONE_MINUTE = 60 * 1000

const aborter = Aborter.timeout(30 * ONE_MINUTE)

const containerName = 'tfile'
module.exports.containerName = containerName

let account = process.env.AZURE_STORAGE_ACCOUNT_NAME
let accountKey = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY
let endpoint = process.env.AZURE_STORAGE_ENDPOINT || 'blob.core.windows.net'

let containerURL

async function init () {
  const sharedKeyCredential = new SharedKeyCredential(account, accountKey)

  const pipeline = StorageURL.newPipeline(sharedKeyCredential)

// List containers
  const serviceURL = new ServiceURL(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
    `https://${account}.${endpoint}`,
    pipeline,
  )

  containerURL = ContainerURL.fromServiceURL(serviceURL, containerName)

  containerURL.getProperties(Aborter.none).then(resp => {
    debug(
      `Get container ${containerName} properties successfully`,
      resp.requestId,
    )
  }).catch(err => {
    debug(err)
    if (err.statusCode === 404) {
      debug('Create container', containerName)
      containerURL.create(Aborter.none).then(createContainerResponse => {
        debug(
          `Create container ${containerName} successfully`,
          createContainerResponse.requestId,
        )
      })
    }
  })
}

if (hasStorageAccount()) {
// An async method returns a Promise object, which is compatible with then().catch() coding style.
  init().then(() => {
    debug('Init pass.')
  }).catch(err => {
    debug(err.message)
  })
}

function getFilesizeInBytes (filename) {
  const stats = fs.statSync(filename)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}

module.exports.uploadStream = async function (
  filePath, fileName, dirRef, option) {
  let opt = option || { progress: () => {} }
  let fileSize = 0

  try {
    if (fs.existsSync(filePath)) {
      //file exists
      fileSize = getFilesizeInBytes(filePath)
    } else {
      debug('file not exists %s', filePath)
      return
    }
  } catch (err) {
    debug('check file exists failed, %o', err)
    return
  }

  filePath = path.resolve(filePath)
  if (fileName === undefined) {
    fileName = path.basename(filePath)
  }

  if (dirRef) {
    if (dirRef.startsWith('/')) {
      dirRef = dirRef.substring(1)
    }

    if (dirRef.endsWith(fileName)) {
      fileName = dirRef
    } else if (dirRef.endsWith('/')) {
      fileName = dirRef + fileName
    } else {
      fileName = dirRef + '/' + fileName
    }
  }

  const blockBlobURL = BlockBlobURL.fromContainerURL(containerURL, fileName)

  const stream = fs.createReadStream(filePath, {
    highWaterMark: FOUR_MEGABYTES,
  })

  const uploadOptions = {
    bufferSize: FOUR_MEGABYTES,
    maxBuffers: 5,
  }

  debug('upload to storage ' + fileName)
  return await uploadStreamToBlockBlob(
    aborter,
    stream,
    blockBlobURL,
    uploadOptions.bufferSize,
    uploadOptions.maxBuffers, {
      progress: (te) => {
        te.fileSize = fileSize
        opt.progress(te)
      },
    })
}

async function listBlobs (dirRef) {
  let marker = undefined
  let result = {}
  do {
    let opt = {}
    if (dirRef) {
      opt = {
        prefix: dirRef,
        include: ['metadata', 'snapshots'],
      }
    }
    const listBlobsResponse = await containerURL.listBlobFlatSegment(
      Aborter.none,
      marker,
      opt,
    )

    marker = listBlobsResponse.nextMarker
    for (const blob of listBlobsResponse.segment.blobItems) {
      result[blob.name] = blob
    }
  } while (marker)

  return result
}

module.exports.listBlobs = listBlobs

async function getBlobUrl (it) {
  const blobURL = BlobURL.fromContainerURL(containerURL, it)
  const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL)
  let resp = await blockBlobURL.getProperties(aborter)
  debug(resp)
  return resp
}

module.exports.getBlobUrl = getBlobUrl

function hasStorageAccount () {
  return account && accountKey
}

module.exports.hasStorageAccount = hasStorageAccount

function setStorageAccount (name, key, url) {
  account = name
  accountKey = key
  endpoint = url

  init().then(() => {
    debug('Config storage account pass.')
  }).catch(err => {
    debug(err.message)
  })
}

module.exports.setStorageAccount = setStorageAccount

module.exports.getAccountName = () => account

module.exports.getAccountEndpoint = () => endpoint