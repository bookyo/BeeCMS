const crypto = require('crypto');
exports.randomcode = function () {
  var num = ""
  for (var i = 0; i < 4; i++) {
    num += Math.floor(Math.random() * 10)
  }
  return num
}
exports.validateEmail = function(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
exports.combinedata = function (existingItem, resolvedData) {
  let data = {};
  if (!existingItem) {
    data = resolvedData;
  } else {
    data = { ...existingItem, ...resolvedData };
  }
  return data;
}
exports.deleteHtmlTag = function(html) {
  return html.replace(/<[^>]+>/g,"");//去掉所有的html标记
}
exports.getHd = function(width) {
  let hd = '';
  if (width === 320) {
    hd = '240P';
  } else if (width === 480) {
    hd = '360P';
  } else if (width === 640) {
    hd = '480P';
  } else if (width === 1138) {
    hd = '640P';
  } else if (width === 1280) {
    hd = '720P';
  } else if (width === 1920) {
    hd = '1080P';
  } else if (width === 2560) {
    hd = '2k';
  } else if (width === 20000) {
    hd = '原画';
  }
  return hd;
}
exports.checkId = function(id) {
  var reg = /^[a-f0-9]{24}$/;
  return reg.test(id)
}
exports.ksort = function (inputArr, sort_flags) { //JS版对象排序
  var tmp_arr = {},
    keys = [],
    sorter, i, k, that = this,
    strictForIn = false,
    populateArr = {};

  switch (sort_flags) {
    case 'SORT_STRING':
      // compare items as strings
      sorter = function (a, b) {
        return that.strnatcmp(a, b);
      };
      break;
    case 'SORT_LOCALE_STRING':
      // compare items as strings, original by the current locale (set with  i18n_loc_set_default() as of PHP6)
      var loc = this.i18n_loc_get_default();
      sorter = this.php_js.i18nLocales[loc].sorting;
      break;
    case 'SORT_NUMERIC':
      // compare items numerically
      sorter = function (a, b) {
        return ((a + 0) - (b + 0));
      };
      break;
    // case 'SORT_REGULAR': // compare items normally (don't change types)
    default:
      sorter = function (a, b) {
        var aFloat = parseFloat(a),
          bFloat = parseFloat(b),
          aNumeric = aFloat + '' === a,
          bNumeric = bFloat + '' === b;
        if (aNumeric && bNumeric) {
          return aFloat > bFloat ? 1 : aFloat < bFloat ? -1 : 0;
        } else if (aNumeric && !bNumeric) {
          return 1;
        } else if (!aNumeric && bNumeric) {
          return -1;
        }
        return a > b ? 1 : a < b ? -1 : 0;
      };
      break;
  }

  // Make a list of key names
  for (k in inputArr) {
    if (inputArr.hasOwnProperty(k)) {
      keys.push(k);
    }
  }
  keys.sort(sorter);

  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ini = this.php_js.ini || {};
  // END REDUNDANT
  strictForIn = this.php_js.ini['phpjs.strictForIn'] && this.php_js.ini['phpjs.strictForIn'].local_value && this.php_js
    .ini['phpjs.strictForIn'].local_value !== 'off';
  populateArr = strictForIn ? inputArr : populateArr;

  // Rebuild array with sorted key names
  for (i = 0; i < keys.length; i++) {
    k = keys[i];
    tmp_arr[k] = inputArr[k];
    if (strictForIn) {
      delete inputArr[k];
    }
  }
  for (i in tmp_arr) {
    if (tmp_arr.hasOwnProperty(i)) {
      populateArr[i] = tmp_arr[i];
    }
  }

  return strictForIn || populateArr;
}
exports.md5 = function (data, codeBase) { //MD5加密
  var buf = typeof data == "string" ? codeBase == 'gbk' ? iconv.encode(data, 'gbk') : Buffer.from(data) : data;
  var str = buf.toString("binary");
  return crypto.createHash("md5").update(str).digest("hex");
}