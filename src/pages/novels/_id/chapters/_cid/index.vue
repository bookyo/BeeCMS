<template>
  <v-row class="mx-auto" justify="center">
    <v-col cols="12">
      <v-card
        :style="
          $vuetify.breakpoint.xsOnly
            ? 'max-width: calc(100% + 48px);margin-left: calc(-24px);margin-right: calc(-24px);'
            : ''
        "
      >
        <v-breadcrumbs :items="items"></v-breadcrumbs>
      </v-card>
    </v-col>
    <v-col cols="12" sm="8">
      <v-card
        :style="
          $vuetify.breakpoint.xsOnly
            ? 'max-width: calc(100% + 48px);margin-left: calc(-24px);margin-right: calc(-24px);'
            : ''
        "
      >
        <v-card-title
          ><h1 class="text-h6">{{ chapter.title }}</h1>
          <v-spacer /><v-btn
            v-if="user && user.id == chapter.owner.id"
            class="ml-5"
            nuxt
            :to="`/novels/${novel.id}/chapters/${chapter.id}/edit`"
            >编辑</v-btn
          ></v-card-title
        >
        <v-card-subtitle>
          <nuxt-link :to="`/users/${chapter.owner.id}`">{{
            chapter.owner.name
          }}</nuxt-link>
          发布于 {{ $moment(chapter.createdAt).fromNow() }}
        </v-card-subtitle>
        <v-card-text>
          <div v-if="allowRead" v-html="chapter.content"></div>
          <div v-else class="order-warning">
            <p>本内容需要点数付费购买，所需积分为：{{ chapter.price }}</p>
            <v-btn @click="pointOrder">点击购买</v-btn>
          </div>
          <div class="text-center">
            <v-btn
              v-if="user && user.isAdmin && chapter.status == 'review'"
              class="mt-5"
              @click="reviewChapter"
              >审核通过</v-btn
            >
            <v-btn class="mt-5" nuxt :to="`/novels/${novel.id}`"
              >返回小说页</v-btn
            >
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="pre"
            nuxt
            :to="`/novels/${novel.id}/chapters/${pre.id}`"
            >{{ pre.title }}</v-btn
          >
          <v-spacer />
          <v-btn
            v-if="next"
            nuxt
            :to="`/novels/${novel.id}/chapters/${next.id}`"
            >{{ next.title }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-col>
    <v-col cols="12" sm="4" class="d-none d-sm-block">
      <v-card>
        <v-card-title>章节导航</v-card-title>
        <v-card-text>
          <v-chip
            label
            class="ma-1"
            outlined
            v-for="chapter in novel.chapters"
            :key="chapter.id"
            nuxt
            :to="`/novels/${novel.id}/chapters/${chapter.id}`"
          >
            {{ chapter.title }}
          </v-chip>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import { findIndex } from "lodash";
export default {
  async asyncData({ app, params, store, error }) {
    const novelId = params.id;
    const id = params.cid;
    const client = app.apolloProvider.defaultClient;
    const response = await client.query({
      query: gql`
        query getData($novelId: ID!, $id: ID!) {
          Novel(where: { id: $novelId }) {
            id
            title
            chapters {
              id
              title
            }
          }
          Chapter(where: { id: $id }) {
            id
            title
            price
            status
            createdAt
            content
            owner {
              id
              name
            }
          }
        }
      `,
      variables: { novelId: novelId, id: id },
      errorPolicy: "all",
      fetchPolicy: 'no-cache',
    });
    const novel = response.data.Novel;
    let chapter = response.data.Chapter;
    const user = store.state.authUser;
    if(chapter.status!='published') {
      if(!user) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
      if(user.id != chapter.owner.id && !user.isAdmin) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
    }
    const chapters = novel.chapters;
    let allowRead = true;
    if (chapter.price > 0) {
      if (!user) {
        allowRead = false;
      } else {
        if (user.id == chapter.owner.id) {
          allowRead = true;
        } else {
          const orderResponse = await client.query({
            query: gql`
              query getPointOrder($typeId: String, $userId: ID!) {
                allPointOrders(
                  where: {
                    typeId: $typeId
                    type: "Chapter"
                    owner: { id: $userId }
                  }
                ) {
                  id
                }
              }
            `,
            variables: { typeId: chapter.id, userId: user.id },
            fetchPolicy: "no-cache",
          });
          if (orderResponse.data.allPointOrders.length) {
            allowRead = true;
          } else {
            allowRead = false;
          }
        }
      }
    }
    const index = findIndex(chapters, { id: chapter.id });
    let next;
    let pre;
    if (chapters[index + 1]) {
      next = chapters[index + 1];
    }
    if (chapters[index - 1]) {
      pre = chapters[index - 1];
    }
    return {
      allowRead,
      novel,
      chapter,
      next,
      pre,
      user: store.state.authUser,
      items: [
        {
          text: "首页",
          disabled: false,
          exact: true,
          to: `/`,
        },
        {
          text: novel.title,
          disabled: false,
          exact: true,
          to: `/novels/${novel.id}`,
        },
        {
          text: chapter.title,
          disabled: true,
          to: `/novels/${novel.id}/chapters/${id}`,
        },
      ],
    };
  },
  methods: {
    async pointOrder() {
      const client = this.$apollo.getClient();
      const user = this.$store.state.authUser;
      const root = this;
      const notify = this.$notify;
      if (!user) {
        notify.toast("请先登录！");
        return;
      }
      notify
        .confirm(
          {
            title: "确定花费" + this.chapter.price + "购买此内容？",
          },
          {
            x: "center",
            y: "center",
            color: "default",
          }
        )
        .then(async function (result) {
          if (result) {
            try {
              const response = await client.mutate({
                mutation: gql`
                  mutation createPointOrder($typeId: String) {
                    createPointOrder(
                      data: { type: "Chapter", typeId: $typeId }
                    ) {
                      id
                    }
                  }
                `,
                variables: { typeId: root.chapter.id },
              });
              const contentResponse = await client.query({
                query: gql`
                  query getContent($id: ID!) {
                    Chapter(where: { id: $id }) {
                      id
                      content
                    }
                  }
                `,
                variables: { id: root.chapter.id },
                fetchPolicy: 'no-cache',
              });
              root.chapter.content = contentResponse.data.Chapter.content;
              root.allowRead = true;
            } catch (error) {
              notify.toast(error.message);
            }
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    },
    async reviewChapter() {
      const client = this.$apollo.getClient();
      const notify = this.$notify;
      const root = this;
      this.$notify
        .confirm(
          {
            title: "确认审核通过？",
          },
          {
            x: "center",
            y: "center",
            color: "default",
          }
        )
        .then(async function (result) {
          if (result) {
            try {
              await client.mutate({
                mutation: gql`
                  mutation passChapter($id: ID!) {
                    updateChapter(id: $id, data: { status: "published" }) {
                      id
                      status
                    }
                  }
                `,
                variables: { id: root.chapter.id },
              });
              root.chapter.status = "published";
              notify.toast("恭喜您，审核通过！");
            } catch (error) {
              console.log(error);
            }
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    },
  },
  head() {
    return {
      title: this.novel.title + ' - ' + this.chapter.title + ' - 在线阅读 - 蜂窝创作平台'
    };
  },
};
</script>