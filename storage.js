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
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE
const ONE_MINUTE = 60 * 1000

const aborter = Aborter.timeout(30 * ONE_MINUTE)

const containerName = 'tfile'

const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY
const endpoint = process.env.AZURE_STORAGE_ENDPOINT || 'blob.core.windows.net'

const sharedKeyCredential = new SharedKeyCredential(account, accountKey)

const pipeline = StorageURL.newPipeline(sharedKeyCredential)

// List containers
const serviceURL = new ServiceURL(
  // When using AnonymousCredential, following url should include a valid SAS or support public access
  `https://${account}.${endpoint}`,
  pipeline,
)
const containerURL = ContainerURL.fromServiceURL(serviceURL, containerName)

async function init () {
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

// An async method returns a Promise object, which is compatible with then().catch() coding style.
init().then(() => {
  debug('Init pass.')
}).catch(err => {
  debug(err.message)
})

async function uploadStream (filePath, fileName, dirRef) {

  try {
    if (fs.existsSync(filePath)) {
      //file exists
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
    uploadOptions.maxBuffers)
}

module.exports.uploadStream = uploadStream

async function listBlobs (dirRef) {
  let marker = undefined
  let result=[]
  do {
    let opt = {}
    if (dirRef) {
      opt = { prefix: dirRef }
    }
    const listBlobsResponse = await containerURL.listBlobFlatSegment(
      Aborter.none,
      marker,
      opt,
    )

    marker = listBlobsResponse.nextMarker
    for (const blob of listBlobsResponse.segment.blobItems) {
      console.log(`Blob: ${blob.name}`)
      result.push(blob.name)
    }
  } while (marker)

  return result
}

module.exports.listBlobs = listBlobs
