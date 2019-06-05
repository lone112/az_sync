module.exports.encodeString = function (str) {
  let s = Buffer.from(str).toString('base64')
  return s.replace(new RegExp('=', 'g'), '')
}
