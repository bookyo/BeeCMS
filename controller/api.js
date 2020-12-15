const { keystone } = require('../index.js');
const { getItem, getItems, createItem, createItems, updateItem } = require('@keystonejs/server-side-graphql-client');
const common = require('../helper/common');
const { update } = require('lodash');

exports.getPreSignUrl = async function (req, res) {
  return res.json({ success: 1 });
}

// 通知接口，用于转码服务器转码之后传递数据或传递错误信息。
exports.cloudServerPayback = async (req, res) => {
  const { success, movie, apikey, apisecret } = req.body;
  console.log(req.body);
  if (!apikey || !apisecret) {
    return res.json({ success: 0 });
  }
  const cloudServers = await getItems({
    keystone,
    listKey: 'CloudServer',
    first: 1,
    where: { apiKey: apikey, apiSecret: apisecret },
    returnFields: 'id,domain'
  })
  console.log(cloudServers);
  if (cloudServers.length == 0) {
    return res.json({ success: 0, message: '没有找到云转码服务器数据！' });
  }
  const cloudServerId = cloudServers[0].id;
  const episode = await getItem({
    keystone,
    listKey: 'Episode',
    itemId: movie.clientId,
    returnFields: 'id,video { id, cover }'
  });
  if(!episode) {
    return res.json({success: 0, message: '不存在此分集！'});
  }
  const videoId = episode.video.id;
  const cover = episode.video.cover;
  if (success == 0) {
    // await updateItem({
    //   keystone,
    //   listKey: 'Video',
    //   item: { id: movie.clientId, data: { status: 'error' } },
    //   returnFields: 'id'
    // });
    // 逻辑转移，将视频升级成可以上传多个分集的视频模块，每个分集可自定义价格。
    await updateItem({
      keystone,
      listKey: 'Episode',
      item: { id: movie.clientId, data: { serverId: movie.id, server: { connect: { id: cloudServerId } }, status: 'error' } },
      returnFields: 'id'
    })
    return res.json({ success: 0, message: '转码失败！' });
  }
  if (!movie) {
    return res.json({ success: 0, message: '没有传递视频数据' });
  }
  let urls = "";
  for (let i = 0; i < movie.m3u8paths.length; i++) {
    const m3u8 = movie.m3u8paths[i];
    const hd = common.getHd(m3u8.hd);
    urls += hd + '$' + cloudServers[0].domain + m3u8.path.replace('./public', '') + '#';
  }
  const playUrlObj = {
    title: movie.originalname,
    url: urls,
    server: { connect: { id: cloudServerId } }
  };
  const newCover = cloudServers[0].domain + movie.poster;
  console.log(playUrlObj);
  // 占位，更新分集对应的视频的海报和标题。
  if(!cover) {
    await updateItem({
      keystone,
      listKey: 'Video',
      item: {
        id: videoId,
        data: {
          cover: newCover
        }
      },
      returnFields: 'id'
    });
  }
  await updateItem({
    keystone,
    listKey: 'Episode',
    item: {
      id: movie.clientId,
      data: {
        status: 'published',
        serverId: movie._id,
        server: { connect: { id: cloudServerId } },
        url: urls
      }
    },
    returnFields: 'id'
  });
  return res.json({ success: 1 });
}

// 码支付payback
exports.codePayback = async (req, res) => {
  const body = req.body;
  const json = JSON.parse(JSON.stringify(body));
  const data = common.ksort(json);
  const pays = await getItems({
    keystone,
    listKey: "Pay",
    where: { type: "codePay" },
    returnFields: `id,apiUrl,appId,secretKey`,
  });
  const pay = pays[0];
  let sign = '';
  const order = await getItem({
    keystone,
    listKey: "Order",
    itemId: body.pay_id,
    returnFields: `
      id
      owner {
        id
        score
      }
      status
      goods {
        id
        score
        price
      }
    `,
  });
  if (order.status == 'finished') {
    return res.send('success');
  }
  for (var key in data) {
    if (data[key] == '' || key == 'sign') continue;
    sign += data[key] == '' ? '' : key + "=" + data[key] + "&";
  }
  sign = sign.substring(0, sign.length - 1); //去掉最后一个&字符
  var key = common.md5(sign + pay.secretKey);//替换为自己的密钥
  if (!body.pay_no || key != body.sign) {
    res.send('fail');
  } else {
    const goods = order.goods;
    if (goods.score) {
      await updateItem({
        keystone,
        listKey: 'Order',
        item: {
          id: body.pay_id,
          data: {
            status: 'finished',
          }
        },
        returnFields: 'id'
      });
      const oldScore = order.owner.score;
      await updateItem({
        keystone,
        listKey: 'User',
        item: {
          id: order.owner.id,
          data: {
            score: oldScore + goods.score
          }
        },
        returnFields: 'id'
      })
      res.send('success');
    }
  }
}