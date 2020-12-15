<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <div class="d-flex flex-sm-nowrap flex-wrap">
            <v-img
              class="flex-shrink-0"
              :src="comic.cover.file.publicUrl"
              :aspect-ratio="$vuetify.breakpoint.smAndDown ? 16 / 9 : 10 / 16"
              min-width="200"
              :max-width="$vuetify.breakpoint.smAndDown ? 1000 : 200"
            >
            </v-img>
            <div
              class="flex-grow-1 flex-shrink-1 d-flex ml-0 ml-sm-5 flex-column"
            >
              <h1 class="text-h6 mb-0 mt-5 mt-sm-0">{{ comic.title }}</h1>
              <div class="d-flex align-center">
                <userInfo :user="comic.owner" :createdAt="comic.createdAt">
                </userInfo>
              </div>
              <p>{{ comic.content }}</p>
              <div>
                <v-chip
                  class="ma-1"
                  small
                  v-for="tag in comic.tags"
                  :key="tag.id"
                  nuxt
                  :to="`/comics/tag/${tag.id}`"
                >
                  {{ tag.title }}
                </v-chip>
              </div>
              <div class="mt-5">
                <v-btn v-if="comic.chapters.length" nuxt :to="`/comics/${comic.id}/chapters/${comic.chapters[0].id}`">
                  开始阅读
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="8">
      <v-card>
        <v-card-title>分集</v-card-title>
        <v-card-text>
          <v-chip-group
            v-if="comic.chapters.length"
            column
            mandatory
            class="flex-grow-0 flex-shrink-0 chapters-wrapper"
            active-class="primary--text"
            v-model="selectChapter"
          >
            <v-chip
              label
              @click="changeChapter"
              outlined
              v-for="chapter in comic.chapters"
              :key="chapter.id"
              nuxt
              :to="`/comics/${comic.id}/chapters/${chapter.id}`"
            >
              {{ chapter.title }}
              <v-icon v-if="chapter.price" right color="orange">{{ mdiStarCircleOutline }}</v-icon>
            </v-chip>
          </v-chip-group>
          <v-btn color="primary" v-if="user && comic.owner.id == user.id" nuxt :to="`/comics/${comic.id}/add`">
            添加章节
          </v-btn>
        </v-card-text>
      </v-card>
      <v-card class="mt-5" v-if="$vuetify.breakpoint.xsOnly">
        <v-card-title>漫画推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="comic in randomComics"
            :key="comic.id"
            :item="comic"
            type="comics"
          >
          </side-card>
        </v-card-text>
      </v-card>
      <v-card class="mt-5">
        <v-card-title>评论区</v-card-title>
        <v-card-text>
          暂未开放
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="4" v-if="$vuetify.breakpoint.smAndUp">
      <v-card>
        <v-card-title>漫画推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="comic in randomComics"
            :key="comic.id"
            :item="comic"
            type="comics"
          >
          </side-card>
        </v-card-text>
      </v-card>
    </v-col>
    <floatMenu :item="comic" type="comic"></floatMenu>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import userInfo from "~/components/userInfo";
import sideCard from "~/components/sideCard";
import floatMenu from "~/components/floatMenu";
import { mdiStarCircleOutline } from "@mdi/js";
export default {
  async asyncData({ app, params, store, error}) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getcomic($id: ID!) {
          Comic(where: { id: $id }) {
            id
            title
            content
            status
            cover {
              id
              file {
                id
                publicUrl
              }
            }
            createdAt
            tags {
              id
              title
            }
            owner {
              id
              name
            }
            chapters {
              id
              title
              price
            }
          }
        }
      `,
      variables: { id: id },
    });
    const comic = response.data.Comic;
    if(comic.status!='published') {
      return error({
        message: '本内容审核中或暂不对外公开！',
        status: 404,
      });
    }
    return {
      comic,
      id,
      episodes: [],
      randomComics: [],
      selectChapter: 0,
      mdiStarCircleOutline,
      user: store.state.authUser,
    };
  },
  components: {
    sideCard,
    userInfo,
    floatMenu,
  },
  async mounted() {
    this.getRandomComics();
  },
  methods: {
    async changeChapter() {
      console.log(this.selectChapter);
    },
    async getRandomComics() {
      const client = this.$apollo.getClient();
      const tags = this.comic.tags;
      let tagsId = [];
      tags.forEach(function (tag) {
        tagsId.push(tag.id);
      });
      const countReponse = await client.query({
        query: gql`
          query getCount($tagsId: [ID]) {
            _allComicsMeta(where: { tags_some: { id_in: $tagsId } }) {
              count
            }
          }
        `,
        variables: { tagsId: tagsId },
      });
      const count = countReponse.data._allComicsMeta.count;
      const first = 12;
      let skip = Math.floor(Math.random() * (count - first));
      if (skip < 0) {
        skip = 0;
      }
      const response = await client.query({
        query: gql`
          query getRandomComics($first: Int, $skip: Int, $tagsId: [ID]) {
            allComics(
              first: $first
              skip: $skip
              where: { tags_some: { id_in: $tagsId } }
            ) {
              id
              title
              owner {
                id
                name
              }
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
              createdAt
            }
          }
        `,
        variables: { tagsId, first, skip },
      });
      const comics = response.data.allComics;
      this.randomComics = comics;
    },
  },
  head() {
    return {
        title: this.comic.title + ' - 最新漫画阅读 - ' + this.comic.owner.name + '的漫画' + ' - 蜂窝创作平台'
    };
  },
};
</script>