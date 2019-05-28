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

function get_url (it) {
  return fetch('/dirs/url?item=' + it).then(resp => {
      return resp.text()
    },
  )
}

function copy_to_clipboard (it, t) {
  get_url(it).then(function (url) {
    let data = url
    if (t === 'curl') {
      data = 'curl \'' + url + '\' --output ' + it
    } else if (t === 'wget') {
      data = 'wget -c \'' + url + '\''
    }

    let el = document.createElement('input')
    el.setAttribute('type', 'text')
    el.setAttribute('value', data)
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    el.remove()
  })
}