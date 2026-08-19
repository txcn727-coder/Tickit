// 标准 AES-128（CBC）纯 JS 实现
// 用于解决 InfinityFree 的 SlowAES JS 挑战（与 decrypt(c,2,key,iv) 兼容）
// 接口：decrypt(cipherArray, mode, keyArray, ivArray) → 明文字节数组（mode 2 = CBC）

var AES_SBOX = [99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
var AES_RSBOX = [82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125];
var AES_RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function aesSubWord(w) {
  return ((AES_SBOX[(w >>> 24) & 0xff] << 24) | (AES_SBOX[(w >>> 16) & 0xff] << 16) | (AES_SBOX[(w >>> 8) & 0xff] << 8) | AES_SBOX[w & 0xff]) >>> 0;
}

// 128-bit 密钥扩展 → 11 组轮密钥（44 words）
function aesExpandKey(key) {
  var w = new Array(44);
  var i;
  for (i = 0; i < 4; i++) {
    w[i] = ((key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3]) >>> 0;
  }
  for (i = 4; i < 44; i++) {
    var t = w[i - 1];
    if (i % 4 === 0) {
      t = ((t << 8) | (t >>> 24)) >>> 0; // RotWord
      t = (aesSubWord(t) ^ (AES_RCON[i / 4] << 24)) >>> 0; // SubWord + Rcon
    }
    w[i] = (w[i - 4] ^ t) >>> 0;
  }
  return w;
}

function aesAddRoundKey(state, w, round) {
  var c;
  for (c = 0; c < 4; c++) {
    var k = w[round * 4 + c];
    state[c][0] = (state[c][0] ^ ((k >>> 24) & 0xff)) & 0xff;
    state[c][1] = (state[c][1] ^ ((k >>> 16) & 0xff)) & 0xff;
    state[c][2] = (state[c][2] ^ ((k >>> 8) & 0xff)) & 0xff;
    state[c][3] = (state[c][3] ^ (k & 0xff)) & 0xff;
  }
}

function aesInvShiftRows(state) {
  var t;
  // 行 1（各列 row=1）右移 1：c3<-c2<-c1<-c0<-c3
  t = state[3][1]; state[3][1] = state[2][1]; state[2][1] = state[1][1]; state[1][1] = state[0][1]; state[0][1] = t;
  // 行 2 右移 2：交换 (0,2) 与 (1,3)
  t = state[0][2]; state[0][2] = state[2][2]; state[2][2] = t;
  t = state[1][2]; state[1][2] = state[3][2]; state[3][2] = t;
  // 行 3 右移 3（等价左移 1）：c0<-c1<-c2<-c3<-c0
  t = state[0][3]; state[0][3] = state[1][3]; state[1][3] = state[2][3]; state[2][3] = state[3][3]; state[3][3] = t;
}

function aesGmul(a, b) {
  var p = 0, hb;
  var i;
  for (i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    hb = a & 0x80;
    a = (a << 1) & 0xff;
    if (hb) a ^= 0x1b;
    b >>>= 1;
  }
  return p & 0xff;
}

function aesInvSubBytes(state) {
  var r, c;
  for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) state[c][r] = AES_RSBOX[state[c][r]];
}

function aesInvMixColumns(state) {
  var c, a0, a1, a2, a3;
  for (c = 0; c < 4; c++) {
    a0 = state[c][0]; a1 = state[c][1]; a2 = state[c][2]; a3 = state[c][3];
    state[c][0] = (aesGmul(a0, 14) ^ aesGmul(a1, 11) ^ aesGmul(a2, 13) ^ aesGmul(a3, 9)) & 0xff;
    state[c][1] = (aesGmul(a0, 9) ^ aesGmul(a1, 14) ^ aesGmul(a2, 11) ^ aesGmul(a3, 13)) & 0xff;
    state[c][2] = (aesGmul(a0, 13) ^ aesGmul(a1, 9) ^ aesGmul(a2, 14) ^ aesGmul(a3, 11)) & 0xff;
    state[c][3] = (aesGmul(a0, 11) ^ aesGmul(a1, 13) ^ aesGmul(a2, 9) ^ aesGmul(a3, 14)) & 0xff;
  }
}

function aesDecryptBlock(block, w) {
  var state = [];
  var r, c;
  for (c = 0; c < 4; c++) state[c] = [block[c * 4], block[c * 4 + 1], block[c * 4 + 2], block[c * 4 + 3]];
  aesAddRoundKey(state, w, 10);
  for (r = 9; r >= 1; r--) {
    aesInvShiftRows(state);
    aesInvSubBytes(state);
    aesAddRoundKey(state, w, r);
    aesInvMixColumns(state);
  }
  aesInvShiftRows(state);
  aesInvSubBytes(state);
  aesAddRoundKey(state, w, 0);
  var out = [];
  for (c = 0; c < 4; c++) for (r = 0; r < 4; r++) out.push(state[c][r] & 0xff);
  return out;
}

// slowAES 兼容入口：decrypt(cipher, mode, key, iv)，mode 2 = CBC
function decrypt(cipher, mode, key, iv) {
  var w = aesExpandKey(key);
  var out = [];
  var prev = iv.slice(0);
  var i;
  for (i = 0; i < cipher.length; i += 16) {
    var blk = cipher.slice(i, i + 16);
    var dec = aesDecryptBlock(blk, w);
    for (var j = 0; j < 16; j++) {
      out.push((dec[j] ^ prev[j]) & 0xff);
    }
    prev = blk;
  }
  return out;
}
var API_BASE = 'http://txcn.top/api.php'
var _storage = null
var _prompt = null
var _fetch = null
var _token = ''
var _offline = false
var _challengeCookie = ''
// InfinityFree 挑战对非浏览器 UA 的请求会异常，统一用浏览器 UA
var BROWSER_UA = 'Mozilla/5.0 (Linux; Android 13; Xiaomi) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'

function init (s, p, f) {
  if (s) _storage = s
  if (p) _prompt = p
  if (f) _fetch = f
}

function setToken (t) { _token = t }

function getToken () { return _token }

// ---------- 离线模式后门 ----------
// 离线模式下所有网络请求直接失败，应用完全本地运行
function isOffline () { return _offline }

function setOffline (v) {
  _offline = !!v
  storageSet('todo_offline', v ? '1' : '0')
}

function loadOffline () {
  return storageGet('todo_offline').then(function (data) {
    _offline = data === '1'
    return _offline
  }).catch(function () {
    _offline = false
    return false
  })
}

// ---------- InfinityFree 挑战解决 ----------
// 服务器对所有非浏览器请求返回 SlowAES 挑战页（AES-128-CBC），
// 手表端用内置 slowAES 库自行解密出 cookie，带 cookie 直连 api.php。
function toNumbers (d) {
  var e = []
  d.replace(/(..)/g, function (d) { e.push(parseInt(d, 16)) })
  return e
}
function toHex (d) {
  var e = ''
  for (var f = 0; f < d.length; f++) e += (16 > d[f] ? '0' : '') + d[f].toString(16)
  return e.toLowerCase()
}
function solveChallenge () {
  return new Promise(function (resolve, reject) {
    if (!_fetch) { reject(new Error('网络模块未初始化')); return }
    _fetch.fetch({
      url: 'http://txcn.top/checklist',
      method: 'GET',
      header: { 'User-Agent': BROWSER_UA },
      responseType: 'text',
      success: function (res) {
        var html = (res && res.data) ? String(res.data) : ''
        console.log('challenge html len:', html.length)
        console.log('challenge head:', html.substring(0, 100))
        var m = html.match(/var a=toNumbers\("([0-9a-f]+)"\),b=toNumbers\("([0-9a-f]+)"\),c=toNumbers\("([0-9a-f]+)"\)/)
        if (!m) {
          console.log('challenge parse fail, slowAES type:', typeof decrypt)
          console.log('challenge html:', html)
          reject(new Error('challenge parse fail'))
          return
        }
        console.log('challenge a/b/c:', m[1].substring(0, 8), m[2].substring(0, 8), m[3].substring(0, 8))
        try {
          var dec = decrypt(toNumbers(m[3]), 2, toNumbers(m[1]), toNumbers(m[2]))
          console.log('decrypt len:', dec.length, 'slowAES type:', typeof decrypt)
          _challengeCookie = '__test=' + toHex(dec)
          console.log('challenge solved:', _challengeCookie.substring(0, 15) + '...')
          resolve(_challengeCookie)
        } catch (e) {
          console.log('challenge decrypt fail:', e && e.message, 'slowAES type:', typeof decrypt)
          reject(new Error('challenge decrypt fail'))
        }
      },
      fail: function (data, code) {
        console.log('challenge fetch fail:', code)
        reject(new Error('challenge fetch fail: ' + code))
      }
    })
  })
}

// ---------- 网络请求 ----------
// 网页版后端协议：{API_BASE}?action=xxx （POST JSON body，token 认证）
// options: { action, params, method, data }
// 返回 Promise，resolve(res.data)，res.data 为后端 JSON 响应体
function request (options) {
  function attempt (resolve, reject) {
    if (!_fetch) { reject(new Error('网络模块不可用')); return }
    var url = API_BASE
    var parts = []
    if (options.action) {
      parts.push('action=' + encodeURIComponent(options.action))
    }
    if (options.params) {
      for (var k in options.params) {
        if (options.params.hasOwnProperty(k)) {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(options.params[k]))
        }
      }
    }
    parts.push('fmt=text') // 设备请求：后端返回 text/plain，Vela 才能拿到原始 JSON 文本
    if (parts.length > 0) {
      url += '?' + parts.join('&')
    }
    var header = options.header || {}
    header['User-Agent'] = BROWSER_UA
    if (_challengeCookie) { header['Cookie'] = _challengeCookie }
    var data = options.data
    if ((options.method === 'POST' || options.method === 'PUT') && data && typeof data === 'object') {
      header['Content-Type'] = 'application/json'
      data = JSON.stringify(data)
    }
    _fetch.fetch({
      url: url,
      method: options.method || 'GET',
      data: data,
      header: header,
      responseType: 'text',
      success: function (res) {
        var d = res.data
        // 若仍返回挑战页（cookie 失效，text/html 时 data 是 HTML 字符串），重解一次再请求
        if (typeof d === 'string' && d.indexOf('aes.js') >= 0 && d.length < 3000) {
          solveChallenge().then(function () {
            request(options).then(resolve).catch(reject)
          }).catch(reject)
          return
        }
        // 后端 fmt=text 返回 text/plain 原始 JSON → 手动解析（兼容数组/对象）
        var parsed = null
        if (typeof d === 'string' && d !== '') {
          try { parsed = JSON.parse(d) } catch (e) { parsed = null }
        } else if (d !== null && d !== undefined) {
          parsed = d
        }
        res.data = parsed
        console.log('request success:', url, 'type:', typeof d, 'parsed:', parsed === null ? 'null' : (typeof parsed === 'object' ? 'obj/' + (parsed.length !== undefined ? parsed.length : 'x') : typeof parsed))
        resolve(res)
      },
      fail: function (data, code) {
        reject(new Error('请求失败: ' + code))
      }
    })
  }
  return new Promise(function (resolve, reject) {
    if (!_fetch) { reject(new Error('网络模块未初始化')); return }
    if (_offline) { reject(new Error('当前处于离线模式')); return }
    if (_challengeCookie) {
      attempt(resolve, reject)
    } else {
      solveChallenge().then(function () {
        attempt(resolve, reject)
      }).catch(reject)
    }
  })
}

// ---------- 云端 API（网页版 api.php 协议） ----------
// 拉取云端清单：GET api.php?token=xxx → todos 数组 [{id,text,completed,priority,is_pinned,category_id}]
function cloudGetTodos (token) {
  return request({ params: { token: token } }).then(function (res) { return res.data })
}
// 添加：POST action=add {token,text,priority,due_date,is_pinned} → {success, id}
function cloudAddTodo (token, text, priority, dueDate, isPinned) {
  var data = { token: token, text: text, priority: priority }
  if (dueDate) { data.due_date = dueDate }
  if (isPinned) { data.is_pinned = 1 }
  return request({ action: 'add', method: 'POST', data: data }).then(function (res) { return res.data })
}
// 切换完成：POST action=toggle {token,id,completed}
function cloudToggleTodo (token, id, completed) {
  return request({ action: 'toggle', method: 'POST', data: { token: token, id: id, completed: completed ? 1 : 0 } }).then(function (res) { return res.data })
}
// 更新：POST action=update {token,id,text,priority,due_date,is_pinned}
function cloudUpdateTodo (token, id, text, priority, dueDate, isPinned) {
  var data = { token: token, id: id, text: text, priority: priority }
  if (dueDate) { data.due_date = dueDate }
  if (isPinned !== undefined && isPinned !== null) { data.is_pinned = isPinned ? 1 : 0 }
  return request({ action: 'update', method: 'POST', data: data }).then(function (res) { return res.data })
}
// 删除：DELETE action=delete&id=xxx&token=xxx
function cloudDeleteTodo (token, id) {
  return request({ action: 'delete', method: 'DELETE', params: { id: id, token: token } }).then(function (res) { return res.data })
}
// 清除已完成：POST action=clear_completed
function cloudClearCompleted (token) {
  return request({ action: 'clear_completed', method: 'POST', data: { token: token } }).then(function (res) { return res.data })
}
// 手表短码绑定：6 位码换 token（无需登录；带上设备唯一标识 device_id，服务器按设备区分）
function cloudDeviceBind (code, deviceId) {
  var data = { code: code }
  if (deviceId) { data.device_id = deviceId }
  return request({ action: 'device_bind', method: 'POST', data: data }).then(function (res) { return res.data })
}

// ---------- 便签（云端 notes 表，与网页版共用） ----------
// 拉取云端便签：GET api.php?action=get_notes&token=xxx → [{id,content,created_ts}]
function cloudGetNotes (token) {
  return request({ action: 'get_notes', params: { token: token } }).then(function (res) { return res.data })
}
// 添加便签：POST action=add_note {token,content} → {success}
function cloudAddNote (token, content) {
  return request({ action: 'add_note', method: 'POST', data: { token: token, content: content } }).then(function (res) { return res.data })
}
// 更新便签：POST action=update_note {token,id,content} → {success}
function cloudUpdateNote (token, id, content) {
  return request({ action: 'update_note', method: 'POST', data: { token: token, id: id, content: content } }).then(function (res) { return res.data })
}
// 删除便签：DELETE action=delete_note&id=xxx&token=xxx → {success}
function cloudDeleteNote (token, id) {
  return request({ action: 'delete_note', method: 'DELETE', params: { id: id, token: token } }).then(function (res) { return res.data })
}

// 获取（或生成）设备唯一标识：首次生成 32 位 hex 并存 storage，之后复用（设备管理/去重用）
function getDeviceId () {
  return storageGet('todo_device_id').then(function (id) {
    if (id) { return id }
    var chars = '0123456789abcdef'
    var out = ''
    for (var i = 0; i < 32; i++) {
      out += chars.charAt(Math.floor(Math.random() * 16))
    }
    return storageSet('todo_device_id', out).then(function () { return out })
  })
}

// 云端同步：拉取云端清单
function syncPull () {
  return cloudGetTodos(_token)
}

// 双向合并（按 cloudId）：云端为准更新本地、云端删除则本地删、本地新建（无 cloudId）保留待上传
function mergeCloudItems (localItems, cloudItems) {
  var cloudMap = {}
  var clist = cloudItems || []
  for (var j = 0; j < clist.length; j++) {
    if (clist[j] && clist[j].id !== undefined && clist[j].id !== null) {
      cloudMap[String(clist[j].id)] = clist[j]
    }
  }
  var result = []
  var list = localItems || []
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    if (item && item.cloudId) {
      var c = cloudMap[String(item.cloudId)]
      if (!c) { continue } // 云端已删除
      item.done = !!c.completed
      item.text = c.text || item.text
      if (c.priority !== undefined && c.priority !== null) { item.priority = parseInt(c.priority, 10) || 2 } // 云端 priority 可能是字符串，统一转数字
      if (c.is_pinned !== undefined && c.is_pinned !== null) { item.is_pinned = parseInt(c.is_pinned, 10) || 0 }
      if (c.created_ts !== undefined && c.created_ts !== null) { item.createdAt = c.created_ts } // 云端绝对时间戳（秒）
      else if (c.created_at) { item.createdAt = c.created_at } // 兜底：字符串时间
      // 截止时间（绝对毫秒时间戳，0=无截止）
      if (c.due_date !== undefined && c.due_date !== null) {
        item.due = parseInt(c.due_date, 10) || undefined
      }
    }
    if (item) { result.push(item) }
  }
  for (var k in cloudMap) {
    if (!cloudMap.hasOwnProperty(k)) { continue }
    var found = false
    for (var m = 0; m < result.length; m++) {
      if (result[m] && String(result[m].cloudId) === k) { found = true; break }
    }
    if (!found) {
      var c2 = cloudMap[k]
      result.push({
        id: String(c2.id),
        cloudId: c2.id,
        text: c2.text || '',
        done: !!c2.completed,
        priority: parseInt(c2.priority, 10) || 2,
        is_pinned: parseInt(c2.is_pinned, 10) || 0,
        createdAt: (c2.created_ts !== undefined && c2.created_ts !== null) ? c2.created_ts : (c2.created_at || Date.now()),
        due: parseInt(c2.due_date, 10) || undefined
      })
    }
  }
  return result
}

// 云端同步：把本地 items 同步到云端（新增的 add，已完成状态不同的 toggle）
// 返回 Promise<{pushed: number}>（避免 Promise.all，用串行链兼容 Vela 引擎）
function syncPush (localItems) {
  return cloudGetTodos(_token).then(function (cloud) {
    var cloudMap = {}
    var cl = cloud || []
    for (var i = 0; i < cl.length; i++) { cloudMap[String(cl[i].id)] = cl[i] }
    var list = localItems || []
    var chain = Promise.resolve()
    var pushed = 0
    for (var j = 0; j < list.length; j++) {
      (function (item) {
        chain = chain.then(function () {
          var cid = item.cloudId
          if (!cid) {
            pushed++
            return cloudAddTodo(_token, item.text || item.title || '', item.priority || 2)
          } else if (cloudMap[String(cid)] && !!(cloudMap[String(cid)].completed) !== !!(item.done)) {
            pushed++
            return cloudToggleTodo(_token, cid, !!item.done)
          }
        })
      })(list[j])
    }
    return chain.then(function () { return { pushed: pushed } })
  })
}

function getTheme () {
  return {
    bg: '#000000',
    surface: '#1A1A1A',
    card: '#2A2A2A',
    cardBorder: '#3A3A3A',
    onSurface: '#FFFFFF',
    textSecondary: '#999999',
    textTertiary: '#666666',
    accent: '#3B82F6',
    accentDark: '#2563EB',
    success: '#4CAF50',
    successDark: '#2E7D32',
    danger: '#FF3B30',
    dangerDark: '#D32F2F',
    warning: '#FF9800',
    gradient1: '#4CAF50',
    gradient2: '#9C27B0',
    gradient3: '#E91E63',
    overlay: 'rgba(0,0,0,0.7)',
    divider: '#333333'
  }
}

function toast (msg) {
  try {
    if (_prompt) { _prompt.showToast({ message: msg, duration: 2000 }) }
  } catch (e) { console.log('toast err:', e) }
}

function storageGet (key) {
  return new Promise(function (resolve, reject) {
    if (!_storage) {
      console.log('storageGet: _storage is null')
      resolve(null)
      return
    }
    try {
      _storage.get({
        key: key,
        success: function (data) {
          console.log('storageGet success:', key, data)
          resolve(data)
        },
        fail: function (data, code) {
          console.log('storageGet fail:', key, code)
          resolve(null)
        }
      })
    } catch (e) {
      console.log('storageGet err:', e)
      resolve(null)
    }
  })
}

function storageSet (key, val) {
  return new Promise(function (resolve) {
    if (!_storage) {
      console.log('storageSet: _storage is null')
      resolve(false)
      return
    }
    try {
      _storage.set({
        key: key,
        value: String(val),
        success: function () {
          console.log('storageSet success:', key)
          resolve(true)
        },
        fail: function (data, code) {
          console.log('storageSet fail:', key, code)
          resolve(false)
        }
      })
    } catch (e) {
      console.log('storageSet err:', e)
      resolve(false)
    }
  })
}

function storageDel (key) {
  if (!_storage) return
  try {
    _storage.delete({ key: key })
  } catch (e) { console.log('storageDel err:', e) }
}

function fmtTime (sec) {
  var m = Math.floor(Math.abs(sec) / 60).toString()
  var s = (Math.abs(sec) % 60).toString()
  if (m.length < 2) { m = '0' + m }
  if (s.length < 2) { s = '0' + s }
  return m + ':' + s
}

function loadTheme (vm) {
  return Promise.resolve().then(function () {
    vm.t = getTheme()
  })
}

function initSampleData () {
  return storageGet('todo_items').then(function (data) {
    if (!data) {
      var sampleItems = [
        { id: '1', text: '欢迎使用TXCN清单', category: '入门', completed: false },
        { id: '2', text: '这是一款智能内容管理应用', category: '介绍', completed: false },
        { id: '3', text: '支持云端同步功能', category: '功能', completed: true }
      ]
      storageSet('todo_items', JSON.stringify(sampleItems))
      return sampleItems
    }
    try {
      return JSON.parse(data)
    } catch (e) {
      return []
    }
  }).catch(function () {
    return []
  })
}

module.exports = {
  API_BASE: API_BASE,
  init: init,
  setToken: setToken,
  getToken: getToken,
  request: request,
  cloudGetTodos: cloudGetTodos,
  cloudAddTodo: cloudAddTodo,
  cloudToggleTodo: cloudToggleTodo,
  cloudUpdateTodo: cloudUpdateTodo,
  cloudDeleteTodo: cloudDeleteTodo,
  cloudClearCompleted: cloudClearCompleted,
  cloudDeviceBind: cloudDeviceBind,
  getDeviceId: getDeviceId,
  cloudGetNotes: cloudGetNotes,
  cloudAddNote: cloudAddNote,
  cloudUpdateNote: cloudUpdateNote,
  cloudDeleteNote: cloudDeleteNote,
  mergeCloudItems: mergeCloudItems,
  syncPull: syncPull,
  syncPush: syncPush,
  isOffline: isOffline,
  setOffline: setOffline,
  loadOffline: loadOffline,
  toast: toast,
  storageGet: storageGet,
  storageSet: storageSet,
  storageDel: storageDel,
  fmtTime: fmtTime,
  getTheme: getTheme,
  loadTheme: loadTheme,
  initSampleData: initSampleData
}
