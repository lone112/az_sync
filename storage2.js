const azure = require('azure-storage')

const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY
const endpoint = process.env.AZURE_STORAGE_ENDPOINT || 'blob.core.windows.net'

const blobService = azure.createBlobService(
  account, accountKey, `https://${account}.${endpoint}`,
)

function getBlobUrl (containerName, blobName) {

  let startDate = new Date()
  let expiryDate = new Date(startDate)
  expiryDate.setMinutes(startDate.getMinutes() + 100)
  startDate.setMinutes(startDate.getMinutes() - 100)

  let sharedAccessPolicy = {
    AccessPolicy: {
      Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
      Start: startDate,
      Expiry: expiryDate,
    },
  }

  let token = blobService.generateSharedAccessSignature(containerName, blobName,
    sharedAccessPolicy)
  return new Promise(((resolve, reject) => {
    try {
      blobService.doesBlobExist(containerName, blobName,
        (err, result, resp) => {
          if (err) {
            reject(err)
          } else if (result) {
            if (result.exists) {
              let sasUrl = blobService.getUrl(containerName, blobName, token)
              resolve(sasUrl)
            } else {
              reject('blob not exists')
            }
          }
        })
    } catch (e) {
      reject(e)
    }
  }))
}

module.exports.getBlobUrl = getBlobUrl