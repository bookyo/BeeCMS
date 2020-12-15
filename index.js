const { Keystone } = require('@keystonejs/keystone');
const { PasswordAuthStrategy } = require('@keystonejs/auth-password');
const { GraphQLApp } = require('@keystonejs/app-graphql');
const { AdminUIApp } = require('@keystonejs/app-admin-ui');
const { NuxtApp } = require('@keystonejs/app-nuxt');
const { MongooseAdapter: Adapter } = require('@keystonejs/adapter-mongoose');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo')(expressSession);
const { createItems } = require('@keystonejs/server-side-graphql-client');
const { Image, User, Group, VipGroup, Novel, Comic, ComicChapter, Chapter, Code, customSchema, Tag, Video, CloudServer, PlayUrl, Bee, Setting, PushTag, PointOrder, Follow, Episode, PayType, Exchange, Pay, Store, Order} = require('./schema');
require('dotenv').config();

const config = {
  endpoint: process.env.ENDPOINT,
  keystoneconfig: {
    name: "beecms",
    queryLimits: {
      maxTotalResults: 1000,
    },
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Default to true in production
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      sameSite: false,
    },
    sessionStore: new MongoStore({ url: process.env.MONGOURI }),
    adapter: new Adapter({
      mongoUri: process.env.MONGOURI,
    }),
    cookieSecret: process.env.COOKIESECRET,
    onConnect: async () => {
      const users = await keystone.lists.User.adapter.findAll();
      if (!users.length) {
        // 创建基础用户组
        await createItems({
          keystone,
          listKey: 'Group',
          items: [{
            data: {
              name: 'LV0',
              score: 0,
              limitCreate: 1,
              needReview: true,
            }
          }, {
            data: {
              name: 'LV1',
              score: 600,
              limitCreate: 3,
              needReview: true,
            }
          }, {
            data: {
              name: 'LV2',
              score: 1200,
              limitCreate: 6,
              needReview: false,
            }
          }]
        });
        // 初始化支付方式
        await createItems({
          keystone,
          listKey: 'PayType',
          items: [
            {
              data: {
                type: 'aliPay',
              },
            },
            {
              data: {
                type: 'qqPay',
              },
            },
            {
              data: {
                type: 'wechatPay',
              },
            },
          ]
        });
        // 创建一部分初始化标签示例
        const tags = ["剧情", "冒险", "奇幻", "歌舞", "战争", "恐怖", "纪录片", "传记", "惊悚", "犯罪", "悬疑", "动作", "科幻", "动画", "喜剧", "爱情"];
        const tagsData = tags.map(function (tag) { return { title: tag } });
        const comicTags = ["热血", "搞笑", "恋爱", "少女", "纯爱", "日常"];
        const comicTagsData = comicTags.map(function (tag) { return { title: tag } });
        const beeTags = ["游戏", "影视", "生活", "科技", "数码"];
        const beeTagsData = beeTags.map(function (tag) { return { title: tag } });
        const novelTags = ["言情", "都市", "玄幻", "仙侠", "轻小说"];
        const novelTagsData = novelTags.map(function (tag) { return { title: tag } });
        await createItems({
          keystone,
          listKey: 'PushTag',
          items: [{
            data: {
              type: 'video',
              tags: { create: tagsData }
            },
          }, {
            data: {
              type: 'comic',
              tags: { create: comicTagsData }
            },
          }, {
            data: {
              type: 'bee',
              tags: { create: beeTagsData }
            },
          }, {
            data: {
              type: 'novel',
              tags: { create: novelTagsData }
            },
          }]
        });
        // 创建初始管理用户
        await createItems({
          keystone,
          listKey: 'User',
          items: [{
            data: {
              name: 'beecms',
              email: 'admin@admin.com',
              isAdmin: true,
              status: "verified",
              password: 'adminadmin'
            }
          }]
        });
        // 创建初始设置
        await createItems({
          keystone,
          listKey: 'Setting',
          items: [{
            data: {
              title: '蜂窝创作平台',
              seoTitle: '蜂窝创作平台，让每个人都能创作',
              tax: 40
            }
          }]
        });
      }
    }
  }
};
const keystone = new Keystone(config.keystoneconfig);

keystone.createList('Image', Image);
keystone.createList('User', User);
keystone.createList('Code', Code);
keystone.createList('VipGroup', VipGroup);
keystone.createList('Group', Group);
keystone.createList('Novel', Novel);
keystone.createList('Comic', Comic);
keystone.createList('ComicChapter', ComicChapter);
keystone.createList('Chapter', Chapter);
keystone.createList('Tag', Tag);
keystone.createList('PushTag', PushTag);
keystone.createList('Video', Video);
keystone.createList('CloudServer', CloudServer);
keystone.createList('PlayUrl', PlayUrl);
keystone.createList('Bee', Bee);
keystone.createList('Setting', Setting);
keystone.createList('PointOrder', PointOrder);
keystone.createList('Follow', Follow);
keystone.createList('Episode', Episode);
keystone.createList('PayType', PayType);
keystone.createList('Exchange', Exchange);
keystone.createList('Pay', Pay);
keystone.createList('Store', Store);
keystone.createList('Order', Order);

keystone.extendGraphQLSchema(customSchema);

const authStrategy = keystone.createAuthStrategy({
  type: PasswordAuthStrategy,
  list: 'User',
  config: {
    identityField: 'email',
    secretField: 'password',
  },
});

module.exports = {
  keystone,
  apps: [
    new GraphQLApp({
      apollo: {
        tracing: true,
        cacheControl: {
          defaultMaxAge: 3600,
        }
      }
    }),
    new AdminUIApp({ authStrategy }),
    new NuxtApp({
      srcDir: 'src',
      buildDir: 'dist',
      cache: true,
      mode: 'universal',
      loading: {
        color: '#fff',
      },
      /*
       ** Headers of the page
       */
      head: {
        title: 'BeeCms',
        meta: [
          { charset: 'utf-8' },
          { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=0' },
        ],
        link: [
          { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
          { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/simplebar@latest/dist/simplebar.css' },
          // {
          //   rel: "stylesheet",
          //   href:
          //     "https://cdn.jsdelivr.net/npm/@mdi/font@4.x/css/materialdesignicons.min.css"
          // }
        ],
        script: [
          { src: 'https://cdn.jsdelivr.net/npm/simplebar@5.2.1/dist/simplebar.min.js' }
        ],
      },
      /*
      ** Load Vuetify into the app
      */
      plugins: [
        { src: "@/plugins/toast.js", ssr: false }
      ],
      build: {
        extractCSS: true,
      },
      /*
      ** Load Vuetify CSS globally
      */
      css: ['~/assets/app.css'],
      modules: ['@nuxtjs/apollo',
        ["@nuxtjs/moment", ["zh-cn"]], ['@nuxtjs/vuetify', {
          theme: {
            dark: true
          },
          defaultAssets: {
            icons: false
          },
          // customVariables: ['~/assets/variables.scss'],
          icons: {
            iconfont: 'mdiSvg', // default - only for display purposes
          },
        }]],
      // markdownit: {
      //   injected: true
      // },
      apollo: {
        clientConfigs: {
          default: {
            httpEndpoint: config.endpoint,
          }
        },
        cookieAttributes: {
          /**
            * Define when the cookie will be removed. Value can be a Number
            * which will be interpreted as days from time of creation or a
            * Date instance. If omitted, the cookie becomes a session cookie.
            */
          expires: 30,

          /**
            * A Boolean indicating if the cookie transmission requires a
            * secure protocol (https). Defaults to false.
            */
          secure: process.env.NODE_ENV === 'production',
        },
      },
    }),
  ],
  configureExpress: app => {
    app.set('trust proxy', true);
  },
};
