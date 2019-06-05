console.log('main')

function upload_item (it, item_id, e) {
  fetch('/dirs/upload', {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: 'item=' + it,
  }).then(resp => {
    e.target.remove()
    sync()
  })
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

function updateItem (id, item) {
  let elId = '#' + id
  let el = document.querySelector(elId)
  if (el !== null) {
    el.classList.add('inprogress')

    let progress_el = document.querySelector(elId + ' div.progress-bar')
    if (item.loadedBytes === item.fileSize) {
      el.classList.remove('inprogress')
    } else {
      let tmp = item.loadedBytes * 100 / item.fileSize
      progress_el.style.width = tmp + '%'
    }
  }

}

function sync () {
  fetch('/dirs/status').
    then(resp => resp.json()).
    then(result => {
      console.log(result)
      Object.keys(result).forEach(it => updateItem(it, result[it]))
    })
}

setInterval(sync, 5000)
sync()