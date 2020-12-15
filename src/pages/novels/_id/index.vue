<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <div class="d-flex flex-sm-nowrap flex-wrap">
            <v-img
              class="flex-shrink-0"
              :src="novel.cover.file.publicUrl"
              :aspect-ratio="$vuetify.breakpoint.smAndDown ? 16 / 9 : 10 / 16"
              min-width="200"
              :max-width="$vuetify.breakpoint.smAndDown ? 1000 : 200"
            >
            </v-img>
            <div
              class="flex-grow-1 flex-shrink-1 d-flex ml-0 ml-sm-5 flex-column"
            >
              <h1 class="text-h6 mb-0 mt-5 mt-sm-0">{{ novel.title }}</h1>
              <div class="d-flex align-center">
                <userInfo :user="novel.owner" :createdAt="novel.createdAt">
                </userInfo>
              </div>
              <p>{{ novel.content }}</p>
              <div>
                <v-chip
                  class="ma-1"
                  small
                  v-for="tag in novel.tags"
                  :key="tag.id"
                  nuxt
                  :to="`/novels/tag/${tag.id}`"
                >
                  {{ tag.title }}
                </v-chip>
              </div>
              <div class="mt-5">
                <v-btn v-if="novel.chapters.length" nuxt :to="`/novels/${novel.id}/chapters/${novel.chapters[0].id}`">
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
            v-if="novel.chapters.length"
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
              v-for="chapter in novel.chapters"
              :key="chapter.id"
              nuxt
              :to="`/novels/${novel.id}/chapters/${chapter.id}`"
            >
              {{ chapter.title }}
              <v-icon v-if="chapter.price" right color="orange">{{ mdiStarCircleOutline }}</v-icon>
            </v-chip>
          </v-chip-group>
          <v-btn color="primary" v-if="user && novel.owner.id == user.id" nuxt :to="`/novels/${novel.id}/add`">
            添加章节
          </v-btn>
        </v-card-text>
      </v-card>
      <v-card class="mt-5" v-if="$vuetify.breakpoint.xsOnly">
        <v-card-title>小说推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="novel in randomNovels"
            :key="novel.id"
            :item="novel"
            type="novels"
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
        <v-card-title>小说推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="novel in randomNovels"
            :key="novel.id"
            :item="novel"
            type="novels"
          >
          </side-card>
        </v-card-text>
      </v-card>
    </v-col>
    <floatMenu :item="novel" type="novel"></floatMenu>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import userInfo from "~/components/userInfo";
import sideCard from "~/components/sideCard";
import floatMenu from "~/components/floatMenu";
import { mdiStarCircleOutline } from "@mdi/js";
export default {
  async asyncData({ app, params, store, error }) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getNovel($id: ID!) {
          Novel(where: { id: $id }) {
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
    const novel = response.data.Novel;
    if(novel.status!='published') {
      return error({
        message: '本内容审核中或暂不对外公开！',
        status: 404,
      });
    }
    return {
      novel,
      id,
      episodes: [],
      randomNovels: [],
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
    this.getRandomNovels();
  },
  methods: {
    async changeChapter() {
      console.log(this.selectChapter);
    },
    async getRandomNovels() {
      const client = this.$apollo.getClient();
      const tags = this.novel.tags;
      let tagsId = [];
      tags.forEach(function (tag) {
        tagsId.push(tag.id);
      });
      const countReponse = await client.query({
        query: gql`
          query getCount($tagsId: [ID]) {
            _allNovelsMeta(where: { tags_some: { id_in: $tagsId }, status: "published" }) {
              count
            }
          }
        `,
        variables: { tagsId: tagsId },
      });
      const count = countReponse.data._allNovelsMeta.count;
      const first = 12;
      let skip = Math.floor(Math.random() * (count - first));
      if (skip < 0) {
        skip = 0;
      }
      const response = await client.query({
        query: gql`
          query getRandomNovels($first: Int, $skip: Int, $tagsId: [ID]) {
            allNovels(
              first: $first
              skip: $skip
              where: { tags_some: { id_in: $tagsId }, status: "published" }
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
      const novels = response.data.allNovels;
      this.randomNovels = novels;
    },
  },
  head() {
    return {
        title: this.novel.title + ' - 最新章节阅读 - ' + this.novel.owner.name + '的小说' + ' - 蜂窝创作平台'
    };
  },
};
</script>