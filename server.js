const express = require('express');
const { keystone, apps } = require('./index.js');
const api = require('./controller/api');
keystone
  .prepare({
    apps: apps,
    dev: process.env.NODE_ENV !== 'production',
  })
  .then(async ({ middlewares }) => {
    await keystone.connect();
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ limit: '5mb', extended: false }));
    app.get('/api/presign', api.getPreSignUrl);
    app.post('/api/payback', api.cloudServerPayback);
    app.post('/codepayback', api.codePayback);
    app.use(middlewares).listen(3000);
  });
