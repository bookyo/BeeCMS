const { keystone } = require('./index');
const { atTracking } = require('@keystonejs/list-plugins');
const { Text, Checkbox, Password, File, Select, Integer, Relationship, DateTime, Virtual } = require('@keystonejs/fields');
const { S3Adapter } = require('@keystonejs/file-adapters');
const { Markdown } = require('@keystonejs/fields-markdown');
const { AuthedRelationship } = require('@keystonejs/fields-authed-relationship');
const { Wysiwyg } = require('@keystonejs/fields-wysiwyg-tinymce');
const Phonevalidate = require('phone');
const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const sms = require('./helper/sms');
const common = require('./helper/common');
const Ioredis = require('ioredis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { getItem, getItems, createItem, updateItem } = require('@keystonejs/server-side-graphql-client');
const redisClient = new Ioredis({});
const sanitizeHtml = require('sanitize-html');
const _ = require('lodash');
const axios = require('axios');
const sharp = require('sharp');
const moment = require('moment');
const { sendEmail } = require('./email/index');
require('dotenv').config();
const Minio = require('minio');

let cloudHost = `http://${process.env.CLOUD_HOST}`;
if (process.env.USE_SSL == 'on') {
  cloudHost = `https://${process.env.CLOUD_HOST}`;
}
const bucket = process.env.BUCKET;
const minioClient = new Minio.Client({
  endPoint: process.env.CLOUD_HOST,
  useSSL: process.env.USE_SSL == 'on' ? true : false,
  accessKey: process.env.ACCESS_ID,
  secretKey: process.env.SECRET_KEY
});

const sanitizeConfig = {
  allowedTags: ['h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'abbr', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe', 'img'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    // We don't currently allow img itself by default, but this
    // would make sense if we did. You could add srcset here,
    // and if you do the URL is checked for safety
    img: ['src']
  },
}

const codeLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'code',
  points: 1, // 5 attempts
  duration: 1 * 60, // within 1 minutes
});

const userIsAdmin = ({ authentication: { item: user } }) =>
  Boolean(user && user.isAdmin);
const userOwnsItem = ({ authentication: { item: user }, existingItem }) => {
  if (!user) {
    return false;
  }
  return existingItem.id === user.id;
};
const userIsVertifed = ({ authentication: { item: user } }) => {
  return !!user && user.status == 'verified';
}
const userIsAdminOrVertifed = auth => {
  const isAdmin = access.userIsAdmin(auth);
  const isVertifed = access.userIsVertifed(auth);
  return isAdmin ? isAdmin : isVertifed;
}
const userIsAdminOrOwner = auth => {
  const isAdmin = access.userIsAdmin(auth);
  const isOwner = access.userOwnsItem(auth);
  return isAdmin ? isAdmin : isOwner;
};
const access = { userIsAdmin, userOwnsItem, userIsAdminOrOwner, userIsAdminOrVertifed, userIsVertifed };

// Read: public / Write: admin
const DEFAULT_ACCESS = {
  create: access.userIsAdmin,
  read: true,
  update: access.userIsAdmin,
  delete: access.userIsAdmin,
};
const allowRead = async ({ authentication: { item }, listKey, existingItem, context }) => {
  // 若价格设置为0，则为开放浏览。
  if (existingItem.price == 0) {
    return true;
  }
  // 若价格大于0，并且没有登录，则直接没有权限。
  if (!item) {
    return false;
  }
  // 若是作者本人或者是管理员，则无需购买直接显示。
  if (existingItem.owner + '' == item.id + '' || item.isAdmin) {
    return true;
  }
  // 获取用户是否购买过此内容
  const pointOrder = await getItems({
    keystone,
    listKey: "PointOrder",
    where: { type: listKey, typeId: existingItem.id, owner: { id: item.id } },
    context: context,
    returnFields: "id"
  });
  // 未购买，禁止访问。
  if (pointOrder.length == 0) {
    return false;
  }
  return true
};
async function checkLimit(context, listKey) {
  const authedItem = context.authedItem;
  const groups = await getItems({
    keystone: keystone,
    listKey: 'Group',
    where: { score_lte: authedItem.score },
    returnFields: 'id,needReview,limitCreate,score',
    context: context
  });
  const orderGroups = _.orderBy(groups, ['score'], ['desc']);
  const activeGroup = orderGroups[0];
  let status = '';
  if (activeGroup.needReview) {
    status = 'review';
  } else {
    status = 'published';
  };
  const today = new Date(new Date().toLocaleDateString()).toISOString();
  const items = await getItems({
    keystone: keystone,
    listKey: listKey,
    where: { owner: { id: authedItem.id }, createdAt_gte: today },
    returnFields: 'id',
    context: context
  });
  const counts = items.length;
  if (counts >= activeGroup.limitCreate) {
    throw new Error('对不起，您每天只能发布' + activeGroup.limitCreate + '个内容！');
  }
  return status;
}

// minio
const S3_PATH = 'images';
const publicUrl = `${process.env.PUBLICURL}/${S3_PATH}/`;
const fileAdapter = new S3Adapter({
  bucket: bucket,
  folder: S3_PATH,
  publicUrl: ({ id, filename, _meta }) =>
    publicUrl + filename,
  s3Options: {
    accessKeyId: process.env.ACCESS_ID,
    secretAccessKey: process.env.SECRET_KEY,
    s3ForcePathStyle: true, // needed with minio?
    signatureVersion: 'v4',
    endpoint: cloudHost, // locally or cloud url
  },
});

// qiniu/s3等
// const S3_PATH = 'uploads';
// const publicUrl = `${process.env.PUBLICURL}/${S3_PATH}/`;
// const fileAdapter = new S3Adapter({
//   bucket: bucket,
//   folder: S3_PATH,
//   publicUrl: ({ id, filename, _meta }) =>
//     publicUrl + filename,
//   s3Options: {
//     accessKeyId: process.env.ACCESS_ID,
//     secretAccessKey: process.env.SECRET_KEY,
//     region: 'cn-south-1',
//     signatureVersion: 'v4',
//     endpoint: cloudHost, // locally or cloud url 'https://s3-cn-south-1.qiniucs.com'
//   },
//   // uploadParams: ({ filename, id, mimetype, encoding }) => ({
//   //   Metadata: {
//   //     keystone_id: id,
//   //   },
//   // }),
// });

// 图片统一管理，对接S3接口，支持亚马逊S3，七牛云，minio和其他支持S3接口的云储存
exports.Image = {
  schemaDoc: '上传的附件和图片，给前端通用调用',
  fields: {
    file: {
      type: File,
      adapter: fileAdapter,
      isRequired: true,
    },
    owner: {
      type: AuthedRelationship,
      ref: "User",
    },
    size: {
      type: Integer,
      access: {
        create: false,
        update: false,
      }
    },
    height: {
      type: Integer,
      access: {
        create: false,
        update: false,
      }
    },
    width: {
      type: Integer,
      access: {
        create: false,
        update: false,
      }
    }
  },
  access: {
    create: access.userIsVertifed,
    update: async ({ authentication: { item } }) => {
      if (!item) {
        return false;
      }
      if (item.isAdmin) {
        return true;
      }
      return { owner: { id: item.id } }
    },
    delete: access.userIsAdmin
  },
  plugins: [
    atTracking(),
  ],
  hooks: {
    resolveInput: async ({ context, resolvedData, existingItem, originalInput }) => {
      if (!resolvedData.file) {
        return resolvedData;
      }
      var mimetype = resolvedData.file.mimetype;
      if (mimetype != 'image/png' && mimetype != 'image/jpg' && mimetype != 'image/jpeg' && mimetype != 'image/gif') {
        await fileAdapter.delete(resolvedData.file);
        throw "sorry, can't support this format!";
      }
      try {
        const url = publicUrl + resolvedData.file.filename;
        const data = await axios({ url: encodeURI(url), responseType: "arraybuffer" });
        const metadata = await sharp(data.data)
          .metadata();
        resolvedData.height = metadata.height;
        resolvedData.width = metadata.width;
        resolvedData.size = metadata.size;
      } catch (error) {
        console.log(error);
        throw new Error('Sorry, upload image error, please try again!');
      }
      return resolvedData;
    },
  },
  label: 'Image'
}

// 用户数据结构
exports.User = {
  label: 'User',
  fields: {
    name: { type: Text, isUnique: true },
    email: {
      type: Text,
      isUnique: true,
      access: {
        read: ({ authentication: { item: user }, existingItem }) => {
          if (!user) {
            return false;
          }
          return user.isAdmin || existingItem.id === user.id;
        },
        update: access.userIsAdmin
      }
    },
    countrycode: {
      type: Text, defaultValue: '+86', access: {
        update: access.userIsAdmin
      }
    },
    status: {
      type: Select, options: 'registed, verified', access: {
        update: access.userIsAdmin
      },
      defaultValue: 'registed'
    },
    score: {
      type: Integer,
      access: {
        update: access.userIsAdmin
      },
      defaultValue: 0
    },
    vipGroup: {
      type: Relationship, ref: "VipGroup", many: false, access: {
        update: access.userIsAdmin
      }
    },
    avatar: {
      type: Relationship,
      ref: "Image"
    },
    description: {
      type: Text,
      isMultiline: true,
    },
    vipExpiresAt: {
      type: DateTime, access: {
        read: ({ authentication: { item: user }, existingItem }) => {
          if (!user) {
            return false;
          }
          return user.isAdmin || existingItem.id === user.id;
        },
        update: access.userIsAdmin
      }
    },
    isAdmin: {
      type: Checkbox, access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    password: {
      type: Password,
      isRequired: true,
      access: {
        read: ({ authentication }) => authentication.item.isAdmin,
        update: access.userIsAdmin
      }
    },
  },
  access: {
    create: access.userIsAdmin,
    update: async ({ authentication: { item } }) => {
      if (!item) {
        return false;
      }
      if (item.isAdmin) {
        return true;
      }
      return { id: item.id }
    },
    delete: access.userIsAdmin,
  },
  plugins: [
    atTracking(),
  ],
  hooks: {
    validateInput: ({
      operation,
      existingItem,
      originalInput,
      resolvedData,
      context,
      actions,
      addFieldValidationError,
    }) => {
      // Throw error objects or register validation errors with addFieldValidationError(<String>)
      // Return values ignored
    },
    resolveInput: async ({ operation, context: { req }, resolvedData, existingItem, originalInput }) => {
      // console.log(req.headers['x-real-ip']);
      // console.log(req.headers['x-forwarded-for']);
      return resolvedData;
    }
  },
}

// 验证码
exports.Code = {
  label: 'Code',
  access: {
    create: access.userIsAdmin,
    read: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin,
  },
  fields: {
    email: {
      type: Text,
      access: {
        read: access.userIsAdmin,
      }
    },
    code: {
      type: Text,
      isRequired: true,
      access: {
        read: access.userIsAdmin,
      }
    },
    requestedAt: { type: DateTime, isRequired: true },
    expiresAt: { type: DateTime, isRequired: true },
  },
}

// 推荐标签：用于发布时推荐标签和不同内容页面的标签聚合
exports.PushTag = {
  schemaDoc: '推荐标签至不同内容类别',
  fields: {
    tags: {
      type: Relationship,
      ref: 'Tag',
      many: true
    },
    type: {
      type: Select,
      dataType: 'string',
      options: 'video, novel, comic, bee'
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
}

// 标签：聚合万物，视频、小说、漫画、自媒体等等。
exports.Tag = {
  schemaDoc: '聚合万物的标签',
  fields: {
    title: {
      type: Text,
      isRequired: true,
      isUnique: true,
    },
    counts: {
      type: Integer,
      defaultValue: 0
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && (item.status == 'verified' || item.isAdmin);
    },
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.title) {
        const reg = new RegExp('^[\u4e00-\u9fa5A-Za-z0-9]{2,15}$');
        if (!reg.test(resolvedData.title)) {
          throw new Error('标签名只能是中文、英文和数字，限定2到15个字符之间！');
        }
      }
      return resolvedData
    }
  }
}

// 漫画comic
exports.Comic = {
  schemaDoc: 'BEECMS之漫画',
  fields: {
    title: {
      type: Text,
      isRequried: true
    },
    content: {
      type: Text,
      isRequired: true,
      isMultiline: true,
    },
    cover: {
      type: Relationship,
      ref: 'Image'
    },
    owner: {
      type: AuthedRelationship,
      ref: 'User'
    },
    chapters: {
      type: Relationship,
      ref: 'ComicChapter.comic',
      many: true
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, published, hidden',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    tags: {
      type: Relationship,
      ref: 'Tag',
      many: true
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, listKey, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否加入审核状态，决定能否继续发布等。
      if (operation == 'create') {
        const status = await checkLimit(context, listKey)
        resolvedData.status = status;
      }
      return resolvedData;
    },
  }
}

// 漫画章节
exports.ComicChapter = {
  schemaDoc: '漫画之章节',
  fields: {
    title: {
      type: Text,
      isRequried: true
    },
    images: {
      type: Relationship,
      ref: "Image",
      many: true,
    },
    owner: {
      type: AuthedRelationship,
      ref: 'User'
    },
    comic: {
      type: Relationship,
      many: false,
      ref: 'Comic.chapters'
    },
    price: {
      type: Integer,
      isRequried: true,
      defaultValue: 0,
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, published, hidden',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, listKey, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否加入审核状态，决定能否继续发布等。
      if (operation == 'create') {
        const status = await checkLimit(context, listKey)
        resolvedData.status = status;
      }
      return resolvedData;
    },
  }
}

// 小说章节
exports.Chapter = {
  schemaDoc: '小说之章节',
  fields: {
    title: {
      type: Text,
      isRequried: true
    },
    content: {
      type: Wysiwyg,
      isRequired: true,
      access: {
        read: allowRead
      }
    },
    owner: {
      type: AuthedRelationship,
      ref: 'User'
    },
    novel: {
      type: Relationship,
      many: false,
      ref: 'Novel.chapters'
    },
    price: {
      type: Integer,
      isRequired: true,
      defaultValue: 0,
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, published, hidden',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, listKey, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否加入审核状态，决定能否继续发布等。
      if (operation == 'create') {
        const status = await checkLimit(context, listKey)
        resolvedData.status = status;
      }
      return resolvedData;
    },
  }
}

// 小说schema
exports.Novel = {
  schemaDoc: 'BEECMS之小说类',
  fields: {
    title: {
      type: Text,
      isRequired: true
    },
    content: {
      type: Text,
      isRequired: true,
      isMultiline: true,
    },
    cover: {
      type: Relationship,
      ref: 'Image'
    },
    owner: {
      type: AuthedRelationship,
      ref: 'User'
    },
    chapters: {
      type: Relationship,
      ref: 'Chapter.novel',
      many: true
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, published, hidden',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    tags: {
      type: Relationship,
      ref: 'Tag',
      many: true
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, listKey, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否加入审核状态，决定能否继续发布等。
      if (operation == 'create') {
        const status = await checkLimit(context, listKey)
        resolvedData.status = status;
      }
      return resolvedData;
    },
  }
}

// Bee自媒体
exports.Bee = {
  schemaDoc: 'Bee自媒体',
  fields: {
    title: {
      type: Text,
      isRequired: true,
    },
    content: {
      type: Wysiwyg,
      isRequired: true,
    },
    cover: {
      type: Relationship,
      ref: "Image"
    },
    tags: {
      type: Relationship,
      ref: "Tag",
      many: true
    },
    paidContent: {
      type: Text,
      access: {
        read: allowRead
      }
    },
    price: {
      type: Integer,
      defaultValue: 0
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, published, hidden',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, listKey, resolvedData, originalInput, existingItem, operation }) => {
      console.log(resolvedData);
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }
      if (resolvedData.paidContent) {
        resolvedData.paidContent = sanitizeHtml(resolvedData.paidContent, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否加入审核状态，决定能否继续发布等。
      if (operation == 'create') {
        const status = await checkLimit(context, listKey)
        resolvedData.status = status;
      }
      return resolvedData;
    },
  }
}
// 视频分集/分来源
exports.Episode = {
  schemaDoc: '视频类的分集或区别源头',
  fields: {
    title: {
      type: Text,
      isRequired: true
    },
    url: {
      type: Text,
      access: {
        read: allowRead
      }
    },
    from: {
      type: Text,
      defaultValue: 'efvcms'
    },
    server: {
      type: Relationship,
      many: false,
      ref: "CloudServer"
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, passed, published, hidden, error',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    path: {
      type: Text,
    },
    serverId: {
      type: Text
    },
    price: {
      type: Integer,
      defaultValue: 0
    },
    video: {
      type: Relationship,
      ref: "Video.episodes",
      many: false
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否将视频加入审核状态，决定能否继续上传视频等。
      if (operation == 'create') {
        const authedItem = context.authedItem;
        const groups = await getItems({
          keystone: keystone,
          listKey: 'Group',
          where: { score_lte: authedItem.score },
          returnFields: 'id,needReview,limitCreate,score',
          context: context
        });
        const orderGroups = _.orderBy(groups, ['score'], ['desc']);
        const activeGroup = orderGroups[0];
        if (activeGroup.needReview) {
          resolvedData.status = 'review';
        } else {
          resolvedData.status = 'passed';
        };
        const today = new Date(new Date().toLocaleDateString()).toISOString();
        const episodes = await getItems({
          keystone: keystone,
          listKey: 'Episode',
          where: { owner: { id: authedItem.id }, createdAt_gte: today },
          returnFields: 'id',
          context: context
        })
        const episodesCounts = episodes.length;
        if (episodesCounts >= activeGroup.limitCreate) {
          throw new Error('对不起，您每天只能上传' + activeGroup.limitCreate + '个视频！');
        }
      }
      return resolvedData;
    },
    afterChange: async ({ context, existingItem, updatedItem, operation }) => {
      // 如果是非用户上传类型视频，则跳过云转码服务器。
      if (!updatedItem.path) {
        return
      }

      // 数据如果不是审核通过状态passed， 则跳过。
      if (updatedItem.status != 'passed') {
        return
      }

      // 如果已经存在的先前的数据已经是审核通过状态，则更新不会触发下面的提交转码任务逻辑。
      if (existingItem && existingItem.status == 'passed') {
        return
      }

      const id = updatedItem.id;
      // const authedItem = context.authedItem;
      const userId = updatedItem.owner;
      const remotePath = cloudHost + '/' + bucket + '/' + userId + '/' + updatedItem.path;
      const cloudServers = await getItems({
        keystone: keystone,
        listKey: 'CloudServer',
        returnFields: 'id, domain, apiKey, apiSecret',
        context: context.createContext({ skipAccessControl: true })
      });
      // 如果未设置云转码服务器，则跳过，即无法使用转码功能。
      if (!cloudServers.length) {
        return
      }

      // 随机使用分布式云转码服务器。
      const randomIndex = Math.floor(Math.random() * cloudServers.length);
      const activeCloudServer = cloudServers[randomIndex];
      try {
        await axios({
          url: activeCloudServer.domain + '/apifluent/createjob',
          method: 'post',
          dataType: 'json',
          data: {
            apikey: activeCloudServer.apiKey,
            apisecret: activeCloudServer.apiSecret,
            clientId: id,
            remotePath,
            notifyUrl: process.env.HOST + '/api/payback'
          }
        })
      } catch (error) {
        console.log(error.message);
      }
    },
    afterDelete: async ({ operation, existingItem, context, listKey }) => {
      const userId = existingItem.owner;
      //如果存在用户上传的视频，则删除云储存中的相应文件和EFV云转码系统中对应的条目。
      console.log(existingItem);
      if (existingItem.path) {
        const objectName = userId + '/' + existingItem.path;
        // 判断是否有服务器信息，没有则跳过，用于还未转码的视频删除。
        if (existingItem.server) {
          const server = await getItem({
            keystone,
            listKey: 'CloudServer',
            itemId: existingItem.server + '',
            context: context.createContext({ skipAccessControl: true }),
            returnFields: `
              id,
              domain,
              apiKey,
              apiSecret
            `
          });
          if (server) {
            await axios({
              url: server.domain + '/apifluent/delete?id=' + existingItem.serverId,
              method: 'delete',
              data: { apikey: server.apiKey, apisecret: server.apiSecret },
              dataType: 'json',
            })
          }
        }
        await minioClient.removeObject(bucket, objectName);
      }
    }
  }
}

// 视频schema
exports.Video = {
  schemaDoc: 'BEECMS之视频类',
  fields: {
    title: {
      type: Text,
      isRequired: true
    },
    content: {
      type: Text,
      isRequired: true,
      isMultiline: true,
    },
    cover: {
      type: Text,
    },
    tags: {
      type: Relationship,
      ref: "Tag",
      many: true
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'review, passed, published, hidden, error',
      access: {
        create: access.userIsAdmin,
        update: access.userIsAdmin,
      }
    },
    episodes: {
      type: Relationship,
      ref: "Episode.video",
      many: true
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (resolvedData.content) {
        resolvedData.content = sanitizeHtml(resolvedData.content, sanitizeConfig);
      }

      // 创建时验证用户的基本权限，决定是否将视频加入审核状态，决定能否继续发布视频等。
      if (operation == 'create') {
        const authedItem = context.authedItem;
        const groups = await getItems({
          keystone: keystone,
          listKey: 'Group',
          where: { score_lte: authedItem.score },
          returnFields: 'id,needReview,limitCreate,score',
          context: context
        });
        const orderGroups = _.orderBy(groups, ['score'], ['desc']);
        const activeGroup = orderGroups[0];
        // if (activeGroup.needReview) {
        //   resolvedData.status = 'review';
        // } else {
        //   resolvedData.status = 'published';
        // };
        // 视频强制审核。
        resolvedData.status = 'review';
        const today = new Date(new Date().toLocaleDateString()).toISOString();
        const videos = await getItems({
          keystone: keystone,
          listKey: 'Video',
          where: { owner: { id: authedItem.id }, createdAt_gte: today },
          returnFields: 'id',
          context: context
        })
        const videoCounts = videos.length;
        if (videoCounts >= activeGroup.limitCreate) {
          throw new Error('对不起，您每天只能发布' + activeGroup.limitCreate + '个视频！');
        }
      }
      return resolvedData;
    },
    afterChange: async ({ context, existingItem, updatedItem, operation }) => {
      // 逻辑转移至episode schema中
    },
    afterDelete: async ({ operation, existingItem, context, listKey }) => {
      // 逻辑转移至episode schema中
    }
  }
}

// efvcms云转码机器设置
exports.CloudServer = {
  schemaDoc: 'EFV云转码系统分布式设置',
  fields: {
    domain: {
      type: Text,
      isRequired: true
    },
    apiKey: {
      type: Text,
      isRequired: true
    },
    apiSecret: {
      type: Text,
      isRequired: true
    },
  },
  access: {
    read: access.userIsAdmin,
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  }
}

// 用户提现记录表
exports.Exchange = {
  schemaDoc: "用户提现记录表",
  fields: {
    score: {
      type: Integer,
      isRequired: true
    },
    name: {
      type: Text,
      isRequired: true,
      access: {
        read: ({ authentication: { item: user }, existingItem }) => {
          if (!user) {
            return false;
          }
          return user.isAdmin || existingItem.owner + "" === user.id;
        },
      }
    },
    branch: {
      type: Text,
      access: {
        read: ({ authentication: { item: user }, existingItem }) => {
          if (!user) {
            return false;
          }
          return user.isAdmin || existingItem.owner + "" === user.id;
        },
      }
    },
    account: {
      type: Text,
      isRequired: true,
      access: {
        read: ({ authentication: { item: user }, existingItem }) => {
          if (!user) {
            return false;
          }
          return user.isAdmin || existingItem.owner + "" === user.id;
        },
      }
    },
    type: {
      type: Select,
      dataType: 'string',
      options: 'aliPay, bank',
      defaultValue: "aliPay",
      isRequired: true
    },
    status: {
      type: Select,
      dataType: 'string',
      options: 'create, finished',
      defaultValue: "create",
      access: {
        create: access.userIsAdmin,
      }
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (operation == 'create') {
        const user = context.authedItem;
        resolvedData.status = 'create';
        const exchangeScore = resolvedData.score;
        const score = user.score;
        if (score < exchangeScore) {
          throw new Error('对不起，您的积分不足' + exchangeScore + '，不足以申请提现！');
        }
        const afterExchange = score - exchangeScore;
        // 将提现过后所剩积分更新至申请提现的用户帐户。
        await updateItem({
          keystone,
          listKey: 'User',
          item: { id: user.id, data: { score: afterExchange } },
          returnFields: 'id',
          context: context.createContext({ skipAccessControl: true })
        });
      }
      return resolvedData;
    },
    afterDelete: async ({ operation, existingItem, context, listKey }) => {
      const userId = existingItem.owner;
      //提现失败，删除数据的时候，将原先扣除的用户积分返还给用户账号。
      const score = existingItem.score;
      const user = await getItem({
        keystone,
        listKey: "User",
        itemId: userId + "",
        returnFields: "id,score",
        context: context.createContext({ skipAccessControl: true })
      });
      const restoreScore = user.score + score;
      await updateItem({
        keystone,
        listKey: 'User',
        item: { id: user.id, data: { score: restoreScore } },
        returnFields: 'id',
        context: context.createContext({ skipAccessControl: true })
      });
    }
  }
}

// 设置支付方式，用于聚合支付/第三方支付选择支付方式。
exports.PayType = {
  schemaDoc: "管理员设置支付方式",
  fields: {
    type: {
      type: Select,
      dataType: 'string',
      options: 'aliPay, qqPay, wechatPay',
      defaultValue: "aliPay",
    },
    name: {
      type: Virtual,
      resolver: item => {
        let title;
        switch (item.type) {
          case 'aliPay':
            title = '支付宝';
            break;
          case 'qqPay':
            title = 'QQ支付';
            break;
          case 'wechatPay':
            title = '微信支付';
            break;
          default:
            break;
        }
        return title
      }
    },
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
}

// 管理员设置支付方式和接口，目前对接码支付。
exports.Pay = {
  schemaDoc: "管理员设置支付方式和接口",
  fields: {
    type: {
      type: Select,
      dataType: 'string',
      options: 'codePay, aliPay, wechatPay',
      defaultValue: "codePay",
    },
    apiUrl: {
      type: Text,
    },
    appId: {
      type: Text,
      access: {
        read: access.userIsAdmin
      }
    },
    payType: {
      type: Relationship,
      ref: "PayType",
      many: true
    },
    secretKey: {
      type: Text,
      access: {
        read: access.userIsAdmin
      }
    },
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
}

// 管理员设置商品，设置积分及对应的价格。
exports.Store = {
  schemaDoc: "管理员设置商品",
  fields: {
    score: {
      type: Integer,
      isRequired: true
    },
    price: {
      type: Integer,
      isRequired: true
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
}

// 用户购买积分订单。
exports.Order = {
  schemaDoc: "用户购买积分订单表",
  fields: {
    status: {
      type: Select,
      dataType: 'string',
      options: 'create, finished',
      defaultValue: "create",
      access: {
        create: access.userIsAdmin,
      }
    },
    goods: {
      type: Relationship,
      ref: "Store"
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (operation == 'create') {
        resolvedData.status = 'create';
      }
      return resolvedData;
    },
  }
}

// 积分订单
exports.PointOrder = {
  schemaDoc: 'BeeCMS的积分订单',
  fields: {
    score: {
      type: Integer,
    },
    typeId: {
      type: Text,
      isRequired: true
    },
    type: {
      type: Select,
      dataType: 'string',
      options: 'Episode, Chapter, ComicChapter, Bee',
      isRequired: true
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      if (operation == 'create') {
        const response = await getItems({
          keystone,
          listKey: "Setting",
          first: 1,
          returnFields: "id,tax",
          context: context
        });
        const user = context.authedItem;
        const tax = response[0].tax;
        const type = resolvedData.type;
        const typeId = resolvedData.typeId;
        let theListKey = type;
        if (!common.checkId(typeId)) {
          throw new Error('对不起，参入的TYPEID不符合要求！');
        }
        const item = await getItem({
          keystone,
          listKey: theListKey,
          itemId: typeId,
          context: context,
          returnFields: `id,price,owner { id, score }`
        });
        if (!item) {
          throw new Error('对不起，参入的ID参数有误！');
        }
        const price = item.price;
        const score = user.score;
        if (score < price) {
          throw new Error('对不起，您的积分不足' + price + '，不足以支付此内容！');
        }
        const afterPay = score - price;
        resolvedData.score = price;
        // 将支付过后所剩积分更新至购买用户帐户。
        await updateItem({
          keystone,
          listKey: 'User',
          item: { id: user.id, data: { score: afterPay } },
          returnFields: 'id',
          context: context.createContext({ skipAccessControl: true })
        });
        // 根据设置的税率，计算用户应得的积分数，若未设置则全额返还给用户。
        let award = price;
        if (tax) {
          award = parseInt(price * (100 - tax) / 100);
        }
        const authorId = item.owner.id;
        const authorScore = item.owner.score;
        await updateItem({
          keystone,
          listKey: 'User',
          item: { id: authorId, data: { score: authorScore + award } },
          returnFields: 'id',
          context: context.createContext({ skipAccessControl: true })
        })
      }
      return resolvedData;
    }
  }
}

// 用户关注
exports.Follow = {
  schemaDoc: 'BeeCMS的用户互相关注',
  fields: {
    followTo: {
      type: Relationship,
      ref: "User",
      many: false
    },
    followBy: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { followBy: { id: user.id } };
    },
    delete: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { followBy: { id: user.id } };
    }
  },
  hooks: {
    resolveInput: async ({ context, resolvedData, originalInput, existingItem, operation }) => {
      return resolvedData;
    }
  }
}

// 基础设置
exports.Setting = {
  schemaDoc: 'BeeCms基础设置',
  fields: {
    title: {
      type: Text,
    },
    seoTitle: {
      type: Text,
    },
    tax: {
      type: Integer,
      isRequired: true,
      defaultValue: 40,
    },
    publicUrl: {
      type: Text,
      defaultValue: process.env.PUBLICURL
    }
  },
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  }
}

// 视频资源
exports.PlayUrl = {
  schemaDoc: '视频的播放资源',
  fields: {
    title: {
      type: Text,
      isRequired: true
    },
    url: {
      type: Text,
      isRequired: true
    },
    from: {
      type: Text,
      defaultValue: 'efvcms'
    },
    server: {
      type: Relationship,
      ref: "CloudServer"
    },
    owner: {
      type: AuthedRelationship,
      ref: "User"
    }
  },
  plugins: [
    atTracking(),
  ],
  access: {
    create: ({ authentication: { item } }) => {
      return !!item && item.status == 'verified';
    },
    update: async ({ gqlName, itemId, itemIds, context, authentication: { item: user, listKey: key } }) => {
      if (!user) {
        return false;
      }
      if (user.isAdmin) {
        return true;
      }
      return { owner: { id: user.id } };
    },
    delete: access.userIsAdmin
  }
}

// 用户组
exports.Group = {
  schemaDoc: '控制用户权限所用的基础用户组',
  fields: {
    name: {
      type: Text,
      isRequired: true,
    },
    score: {
      type: Integer,
      defaultValue: 0,
    },
    limitCreate: {
      type: Integer,
      isRequired: true,
    },
    needReview: {
      type: Checkbox,
      isRequired: true,
    }
  },
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  }
}

// vip用户组
exports.VipGroup = {
  schemaDoc: 'VIP用户组的权限控制',
  fields: {
    name: {
      type: Text,
      isRequired: true,
    },
    freeAd: {
      type: Checkbox,
      isRequired: true,
    },
    allowView: {
      type: Integer,
      isRequired: true,
    },
  },
  access: {
    create: access.userIsAdmin,
    update: access.userIsAdmin,
    delete: access.userIsAdmin
  }
}


exports.customSchema = {
  queries: [{
    schema: 'preSignUrl(name: String!): String',
    resolver: async (obj, { name }, context) => {
      if (!context.authedItem) {
        throw new Error('对不起，请登录！');
      }
      const authedId = context.authedItem.id;
      try {
        const url = await minioClient.presignedPutObject(bucket, `${authedId}/${name}`, 24 * 60 * 60);
        return url;
      } catch (error) {
        throw error;
      }
    }
  },
  {
    schema: 'getCodePayUrl(id: ID!, type: Int!): String',
    resolver: async (obj, { id, type }, context) => {
      if (!context.authedItem) {
        throw new Error('对不起，请登录！');
      }
      const authedId = context.authedItem.id;
      const host = process.env.HOST;
      const order = await getItem({
        keystone,
        listKey: "Order",
        itemId: id,
        returnFields: `
          id,
          owner {
            id
          }
          status
          goods {
            id
            score
            price
          }
        `,
        context: context
      });
      if(!order && order.status != 'create') {
        throw new Error("对不起，没有此订单或订单已经完成！");
      };
      const pays = await getItems({
        keystone,
        listKey: "Pay",
        where: { type: "codePay" },
        returnFields: `id,apiUrl,appId,secretKey`,
        context: context.createContext({ skipAccessControl: true }),
      })
      const pay = pays[0];
      const notifyUrl = host + '/codepayback';
      const arr = { id: pay.appId, pay_id: id, type: type * 1, price: order.goods.price, notify_url: notifyUrl, return_url: host + '/users/' + authedId };
      const data = common.ksort(arr);
      let sign = '';
      for (var key in data) {
        sign += data[key] == '' ? '' : key + "=" + data[key] + "&";
      }
      sign = sign.substring(0, sign.length - 1); //去掉最后一个&字符
      var key = common.md5(sign + pay.secretKey);//替换为自己的密钥
      const url = `${pay.apiUrl}?` + sign + '&sign=' + key; //支付页面
      return url
    }
  }],
  mutations: [
    {
      schema: 'startSendCode(email: String!): Code',
      resolver: async (obj, { email }, context) => {
        const req = context.req;
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;
        try {
          const resConsume = await codeLimiter.consume(ip);
        } catch (rlRejected) {
          if (rlRejected instanceof Error) {
            throw rlRejected;
          } else {
            throw new Error('Too many request, try after 1 minute!');
          }
        }
        const code = common.randomcode();
        if (!common.validateEmail(email)) {
          throw new Error('Not a valid email!');
        }
        const tokenExpiration =
          parseInt(process.env.CODE_EXPIRY) || 1000 * 60 * 2;

        const now = Date.now();
        const requestedAt = new Date(now).toISOString();
        const expiresAt = new Date(now + tokenExpiration).toISOString();
        const { errors: codeErros, data: codeData } = await context.executeGraphQL({
          context: context.createContext({ skipAccessControl: true }),
          query: `
            query getCode($email: String!, $now: DateTime!) {
              allCodes(where: { email: $email, expiresAt_gte: $now }) {
                id
                code
                email
              }
            }
          `,
          variables: { email, now: requestedAt }
        });
        if (!codeErros && codeData.allCodes && codeData.allCodes.length) {
          return { id: codeData.allCodes[0].id };
        }

        const result = {
          email,
          code,
          requestedAt,
          expiresAt,
        };

        const { errors, data } = await context.executeGraphQL({
          context: context.createContext({ skipAccessControl: true }),
          query: `
            mutation createCode(
              $email: String,
              $code: String,
              $requestedAt: DateTime,
              $expiresAt: DateTime,
            ) {
              createCode(data: {
                email: $email,
                code: $code,
                requestedAt: $requestedAt,
                expiresAt: $expiresAt,
              }) {
                id
                code
                email
                requestedAt
                expiresAt
              }
            }
          `,
          variables: result,
        });
        const newCode = data.createCode;

        if (errors) {
          throw errors.message;
        }
        const options = {
          subject: code + ' 是您的验证码',
          to: email,
          from: process.env.MAILGUN_FROM,
          domain: process.env.MAILGUN_DOMAIN,
          apiKey: process.env.MAILGUN_API_KEY,
        };

        await sendEmail('sendCode.pug', { code: code }, options);
        return {
          id: newCode.id
        };
      },
    },
    {
      schema: 'createUserByCode(email: String!, password: String!, name: String!, code: String!): User',
      resolver: async (obj, { email, password, name, code }, context) => {
        if (!common.validateEmail(email)) {
          throw new Error('your email is not a valid email!');
        }
        const now = Date.now();
        const isonow = new Date(now).toISOString();
        const { errors, data } = await context.executeGraphQL({
          context: context.createContext({ skipAccessControl: true }),
          query: `
            query findCode($code: String!, $email: String!, $now: DateTime!) {
              allCodes(where: { code: $code, email: $email, expiresAt_gte: $now  }) {
                code
                email
                requestedAt
                expiresAt
              }
            }
          `,
          variables: { code, email, now: isonow },
        });
        if (errors || !data.allCodes || !data.allCodes.length) {
          throw new Error('sorry, not found valid code or email, please resend vertify code');
        }
        const { errors: userErrors, data: userData } = await context.executeGraphQL({
          context: context.createContext({ skipAccessControl: true }),
          query: `
            mutation createUser($email: String!, $password: String!, $name: String!) {
              createUser(data: { email: $email, password: $password, name: $name, status: verified, isAdmin: false}) {
                id,
                name,
              }
            }
          `,
          variables: { email, password, name }
        });
        if (userErrors) {
          throw userErrors;
        }
        return userData.createUser;
      }
    },
  ],

}



