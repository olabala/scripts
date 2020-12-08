const path = require('path');
const LocalStorage = require('node-localstorage').LocalStorage;
module.exports = new LocalStorage(path.resolve(__dirname, './cache'));
