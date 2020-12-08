const axios = require('axios');
const storage = require('../storage');

const request = axios.create({
  baseURL: 'https://api.52jiayundong.com/',
});

// 添加响应拦截器
request.interceptors.request.use((config) => {
  const token = storage.getItem('token');
  if (token) {
    config.headers.token = token;
  }
  config.headers = {
    api_version: 5,
    platform: 1,
    ...config.headers
  }
  return config;
}, (error) => {
  return Promise.reject(error.response);
});

// 添加响应拦截器
request.interceptors.response.use((response) => {
  if (response.data.code !== 900) {
    return Promise.reject(response);
  }
  return response.data;
}, (error) => {
  return Promise.reject(error.response);
});

module.exports = request;
