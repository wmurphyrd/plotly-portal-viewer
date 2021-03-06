// modified from npm package dyss to use module.exports for rollup compatibility
module.exports = (function () {
  function Sheet () {
    var style
    style = document.createElement('style')
    document.head.appendChild(style)
    this.sheet = style.sheet
  }

  Sheet.prototype.addMediaAttribute = function (mediaAttribute) {
    this._style.setAttribute('media', mediaAttribute)
  }

  Sheet.prototype.getSheet = function () {
    return this.sheet
  }

  Sheet.prototype._add = function (selector, rules, index) {
    if (index != null) {
      index = 0
    }
    if (this.sheet.insertRule) {
      this.sheet.insertRule(selector + ' { ' + rules + ' }', index)
    } else {
      this.sheet.add(selector, rules, index)
    }
  }

  Sheet.prototype.add = function (selector, set) {
    var key, rules, value
    rules = (function () {
      var results
      results = []
      for (key in set) {
        value = set[key]
        results.push((this._cssify(key)) + ': ' + value + ';')
      }
      return results
    }.call(this))
    rules = rules.join(' ')
    this._add(selector, rules)
  }

  Sheet.prototype.addClass = function (set) {
    var name, randomClass
    name = this._getRandomName()
    randomClass = '.' + name
    this.add(randomClass, set)
    return name
  }

  Sheet.prototype.updateSet = function (selector, set) {
    var item, key, value
    item = this._getSelector(selector)
    if (item === -1) {
      this.add(selector, set)
    } else {
      for (key in set) {
        value = set[key]
        item.style[key] = value
      }
    }
  }

  Sheet.prototype._cssify = function (proprety) {
    var cssedProperty, temp
    cssedProperty = ''
    temp = proprety.split(/(?=[A-Z])/)
    if (temp instanceof Array && temp.length === 2) {
      temp[1] = temp[1].toLowerCase()
      cssedProperty = temp.join('-')
    } else {
      cssedProperty = temp
    }
    return cssedProperty
  }

  Sheet.prototype._getSelector = function (selector) {
    var i, len, rule, rulesArray
    rulesArray = this.sheet.rules
    if (!rulesArray) {
      rulesArray = this.sheet.cssRules
    }
    for (i = 0, len = rulesArray.length; i < len; i++) {
      rule = rulesArray[i]
      if (rule.selectorText === selector) {
        return rule
      }
    }
    return -1
  }

  Sheet.prototype._getRandomName = function (length) {
    var name
    if (length == null) {
      length = 8
    }
    name = ''
    while (name.length < length) {
      name += Math.random().toString(36).substr(2)
    }
    return name.substr(0, length)
  }

  Sheet.prototype._getSelectorType = function (selector) {
    var firstChar
    firstChar = selector.chatAt(0)
    return (function () {
      switch (false) {
        case firstChar !== '.':
          return 'class'
        case firstChar !== '#':
          return 'id'
        default:
          return 'element'
      }
    })()
  }

  return Sheet
})()
