const raw = {
  'zh-cn': require('../i18n/zh-CN.json'),
  'zh-tw': require('../i18n/zh-TW.json'),
  'de-de': require('../i18n/de-DE.json'),
  'en-us': require('../i18n/en-US.json'),
  'es-es': require('../i18n/es-ES.json'),
  'fr-fr': require('../i18n/fr-FR.json'),
  'id-id': require('../i18n/id-ID.json'),
  'ja-jp': require('../i18n/ja-JP.json'),
  'ko-kr': require('../i18n/ko-KR.json'),
  'pt-pt': require('../i18n/pt-PT.json'),
  'ru-ru': require('../i18n/ru-RU.json'),
  'th-th': require('../i18n/th-TH.json'),
  'vi-vn': require('../i18n/vi-VN.json')
}
const config = require('./config')
const isPlainObject = require('lodash/isPlainObject')

const addProp = (obj, key) => {
  if (isPlainObject(obj[key])) {
    return obj[key]
  } else if (typeof obj[key] === 'undefined') {
    let temp = {}
    obj[key] = temp
    return temp
  }
}

const parseData = (data) => {
  const result = {}
  for (let key in data) {
    let temp = result
    const arr = key.split('.')
    arr.forEach((prop, index) => {
      if (index === arr.length - 1) {
        temp[prop] = data[key]
      } else {
        temp = addProp(temp, prop)
      }
    })
  }
  return result
}

const assignData = (objA, objB) => {
  const temp = { ...objA }
  for (let key in objB) {
    if (objB[key]) {
      temp[key] = objB[key]
    }
  }
  return temp
}

const i18nMap = new Map()
const prepareData = () => {
  for (let key in raw) {
    let temp = {}
    if (key === 'zh-tw') {
      temp = assignData(raw['zh-cn'], raw[key])
    } else {
      temp = assignData(raw['zh-cn'], assignData(raw['en-us'], raw[key]))
    }
    i18nMap.set(key, parseData(temp))
  }
}

prepareData()

const parseText = (text, data) => {
  return text.replace(/(\${.+?})/g, function (...args) {
    const key = args[0].slice(2, args[0].length - 1)
    if (data[key]) return data[key]
    return args[0]
  })
}

const mainProps = [
  'symbol', 'ui', 'log', 'excel',"uigf"
]

const i18n = new Proxy(raw, {
  get (obj, prop) {
    if (prop === 'data') {
      return i18nMap.get(config.lang)
    } else if (mainProps.includes(prop)) {
      return i18nMap.get(config.lang)[prop]
    } else if (prop === 'parse') {
      return parseText
    }
    return obj[prop]
  }
})

module.exports = i18n











