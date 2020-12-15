<template>
  <v-row class="mx-auto" align="center" justify="center">
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
      <v-card
        class="text-center mt-5"
        :style="
          $vuetify.breakpoint.xsOnly
            ? 'max-width: calc(100% + 48px);margin-left: calc(-24px);margin-right: calc(-24px);'
            : ''
        "
      >
        <div class="images-wrapper" v-if="allowRead">
          <v-img
            class="mx-auto"
            v-for="image in sortImages"
            :key="image.id"
            :aspect-ratio="image.width / image.height"
            :src="image.file.publicUrl"
            :max-width="image.width"
          >
          </v-img>
        </div>
        <div v-else class="order-warning">
          <p>本内容需要点数付费购买，所需积分为：{{ comicChapter.price }}</p>
          <v-btn @click="pointOrder">点击购买</v-btn>
        </div>
        <v-btn
          v-if="user && user.isAdmin && comicChapter.status == 'review'"
          class="mt-5"
          color="primary"
          @click="reviewChapter"
          >审核通过</v-btn
        >
        <v-btn class="mt-5" nuxt :to="`/comics/${comic.id}`">返回漫画页</v-btn>
        <v-card-actions>
          <v-btn
            v-if="pre"
            nuxt
            :to="`/comics/${comic.id}/chapters/${pre.id}`"
            >{{ pre.title }}</v-btn
          >
          <v-spacer />
          <v-btn
            v-if="next"
            nuxt
            :to="`/comics/${comic.id}/chapters/${next.id}`"
            >{{ next.title }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import { findIndex, sortBy } from "lodash";
export default {
  async asyncData({ app, params, store, error }) {
    const comicId = params.id;
    const id = params.cid;
    const client = app.apolloProvider.defaultClient;
    const response = await client.query({
      query: gql`
        query getData($comicId: ID!, $id: ID!) {
          Comic(where: { id: $comicId }) {
            id
            title
            chapters {
              id
              title
            }
          }
          ComicChapter(where: { id: $id }) {
            id
            title
            status
            price
            owner {
              id
            }
            images {
              id
              width
              height
              file {
                id
                originalFilename
                publicUrl
              }
            }
          }
        }
      `,
      variables: { comicId: comicId, id: id },
    });
    const comic = response.data.Comic;
    const comicChapter = response.data.ComicChapter;
    const user = store.state.authUser;
    if(comicChapter.status!='published') {
      if(!user) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
      if(user.id != comicChapter.owner.id && !user.isAdmin) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
    }
    let allowRead = true;
    if (comicChapter.price > 0) {
      if (!user) {
        allowRead = false;
      } else {
        if (user.id == comicChapter.owner.id) {
          allowRead = true;
        } else {
          const orderResponse = await client.query({
            query: gql`
              query getPointOrder($typeId: String, $userId: ID!) {
                allPointOrders(
                  where: {
                    typeId: $typeId
                    type: "ComicChapter"
                    owner: { id: $userId }
                  }
                ) {
                  id
                }
              }
            `,
            variables: { typeId: comicChapter.id, userId: user.id },
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
    const chapters = comic.chapters;
    const index = findIndex(chapters, { id: comicChapter.id });
    console.log(index);
    let next;
    let pre;
    if (chapters[index + 1]) {
      next = chapters[index + 1];
    }
    if (chapters[index - 1]) {
      pre = chapters[index - 1];
    }
    return {
      comic,
      comicChapter,
      next,
      pre,
      user: store.state.authUser,
      allowRead,
      items: [
        {
          text: "首页",
          disabled: false,
          exact: true,
          to: `/`,
        },
        {
          text: comic.title,
          disabled: false,
          exact: true,
          to: `/comics/${comic.id}`,
        },
        {
          text: comicChapter.title,
          disabled: true,
          to: `/comics/${comic.id}/chapters/${id}`,
        },
      ],
    };
  },
  computed: {
    sortImages() {
      const images = this.comicChapter.images;
      const sortImages = sortBy(images, function(image) { return image.file.originalFilename; });
      return sortImages;
    }
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
            title: "确定花费" + this.comicChapter.price + "购买此内容？",
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
                      data: { type: "ComicChapter", typeId: $typeId }
                    ) {
                      id
                    }
                  }
                `,
                variables: { typeId: root.comicChapter.id },
              });
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
                  mutation passComicChapter($id: ID!) {
                    updateComicChapter(id: $id, data: { status: "published" }) {
                      id
                      status
                    }
                  }
                `,
                variables: { id: root.comicChapter.id },
              });
              root.comicChapter.status = "published";
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
      title: this.comic.title + ' - ' + this.comicChapter.title + ' - 在线漫画阅读 - 蜂窝创作平台'
    };
  },
};
</script>