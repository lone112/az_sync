console.log('main')

function upload_item (it, e) {
  var xhr = new XMLHttpRequest()
  xhr.open('POST', '/dirs/upload', true)

  //Send the proper header information along with the request
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')

  xhr.onreadystatechange = function () { // Call a function when the state changes.
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      // Request finished. Do processing here.
      console.log('upload', it, 'pass')
      e.target.remove()
    }
  }
  xhr.send('item=' + it)

}