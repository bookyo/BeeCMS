<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-card-title>“{{ q }}”的搜索结果</v-card-title>
      </v-card>
      <itemSection title="视频" :items="videos" type="videos" />
      <itemSection title="漫画" :items="comics" type="comics" />
      <itemSection title="小说" :items="novels" type="novels" />
      <itemSection title="蜂窝号" :items="bees" type="bees" />
    </v-col>
  </v-row>
</template>

<script>
import gql from "graphql-tag";
import itemSection from "~/components/itemSection";
export default {
  async asyncData({ app, redirect, error, params, query, store }) {
    const client = app.apolloProvider.defaultClient;
    const q = query.q;
    return {
      q,
      videos: [],
      comics: [],
      novels: [],
      bees: [],
    };
  },
  watch: {
    $route(to, from) {
      this.q = to.query.q;
      this.getResults();
    },
  },
  mounted() {
    this.getResults();
  },
  methods: {
    async getResults() {
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query searchTitle($q: String) {
            allVideos(
              first: 8
              where: { title_contains_i: $q, status: "published" }
            ) {
              id
              title
              cover
              createdAt
              owner {
                id
                name
              }
            }
            allComics(
              first: 8
              where: { title_contains_i: $q, status: "published" }
            ) {
              id
              title
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
              createdAt
              owner {
                id
                name
              }
            }
            allNovels(
              first: 8
              where: { title_contains_i: $q, status: "published" }
            ) {
              id
              title
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
              createdAt
              owner {
                id
                name
              }
            }
            allBees(
              first: 8
              where: { title_contains_i: $q, status: "published" }
            ) {
              id
              title
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
              createdAt
              owner {
                id
                name
              }
            }
          }
        `,
        variables: { q: this.q },
      });
      const videos = response.data.allVideos;
      const comics = response.data.allComics;
      this.comics = comics;
      this.videos = videos;
      this.bees = response.data.allBees;
      this.novels = response.data.allNovels;
    },
  },
  components: {
    itemSection,
  },
  head() {
    return {
      title: `搜索页面 - BeeCMS`
    }
  }
};
</script>