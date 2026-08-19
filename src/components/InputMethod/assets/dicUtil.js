var dict = null

let SimpleInputMethod = {
    dict: {},
    _inited: false
}

SimpleInputMethod.initDict = function() {
    if (this._inited) return
    if (!dict) {
        try { dict = require('./dic.js').dict } catch (e) { dict = {} }
    }
    this.dict.py2hz = dict;
    this.dict.py2hz2 = {};
    this.dict.py2hz2['i'] = 'i';

    for (let key in this.dict.py2hz) {
        let ch = key[0];
        if (!this.dict.py2hz2[ch]) {
            this.dict.py2hz2[ch] = this.dict.py2hz[key];
        }
    }
    this._inited = true
};

SimpleInputMethod.getSingleHanzi = function(pinyin){
    if (!this._inited) this.initDict()
    return this.dict.py2hz2[pinyin] || this.dict.py2hz[pinyin] || '';
}

SimpleInputMethod.getHanzi = function(pinyin) {
    if (!this._inited) this.initDict()
    let result = this.getSingleHanzi(pinyin);
    if (result) return [result.split(''), pinyin];

    let temp = '';
    let start = Math.min(pinyin.length, 6);

    for (let i = start; i >= 1; i--) {
        let str = pinyin.substr(0, i);
        let rs = this.getSingleHanzi(str);
        if (rs) return [rs.split(''), str];
    }

    return [[], ''];
};

export { SimpleInputMethod }