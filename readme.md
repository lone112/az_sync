Upload file to storage account

docker run --rm -p 8080:3000 -v $PWD:/data \
 -e AZURE_STORAGE_ACCOUNT_NAME=XXX \
 -e AZURE_STORAGE_ACCOUNT_ACCESS_KEY=XXX \
 -e AZURE_STORAGE_ENDPOINT=XXX \
 <image>