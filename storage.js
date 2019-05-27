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
} = require('@azure/storage-blob')

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

async function main () {
  let marker
  do {
    const listContainersResponse = await serviceURL.listContainersSegment(
      Aborter.none,
      marker,
    )

    marker = listContainersResponse.nextMarker
    for (const container of listContainersResponse.containerItems) {
      console.log(`Container: ${container.name}`)
    }
  } while (marker)

}

// An async method returns a Promise object, which is compatible with then().catch() coding style.
main().then(() => {
  console.log('Successfully executed sample.')
}).catch(err => {
  console.log(err.message)
})