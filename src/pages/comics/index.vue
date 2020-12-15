<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <tab type="comics" :items="pushTag.tags"></tab>
    </v-col>
    <v-col cols="12" sm="3" v-for="comic in comics" :key="comic.id">
      <card
        type="comics"
        :cover="comic.cover.file.publicUrl"
        :item="comic"
      ></card>
    </v-col>
    <v-col cols="12" class="text-center" v-if="haveMore">
      <v-btn @click="loadMore" :loading="loading" outlined color="primary"
        >加载更多…</v-btn
      >
    </v-col>
  </v-row>
</template>

<script>
import gql from "graphql-tag";
import card from "~/components/card";
import tab from "~/components/tab";
export default {
  async asyncData({ app }) {
    const client = app.apolloProvider.defaultClient;
    const response = await client.query({
      query: gql`
        query getData($first: Int, $skip: Int) {
          allPushTags(where: { type: "comic" }) {
            id
            tags {
              id
              title
            }
            type
          }
          allComics(
            first: $first
            skip: $skip
            sortBy: createdAt_DESC
            where: { status: "published" }
          ) {
            id
            title
            createdAt
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
          }
        }
      `,
      variables: {
        first: 16,
        skip: 0,
      },
    });
    let haveMore = true;
    const comics = response.data.allComics;
    if (comics.length < 16) {
      haveMore = false;
    }
    const pushTag = response.data.allPushTags[0];
    return {
      comics,
      haveMore,
      loading: false,
      page: 1,
      pushTag,
    };
  },
  components: {
    card,
    tab,
  },
  methods: {
    async loadMore() {
      this.page++;
      var first = 16;
      var skip = (this.page - 1) * first;
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getNewcomics($first: Int, $skip: Int) {
            allComics(
              first: $first
              skip: $skip
              sortBy: createdAt_DESC
              where: { status: "published" }
            ) {
              id
              title
              createdAt
              owner {
                id
                name
              }
              cover {
                file {
                  publicUrl
                }
              }
            }
          }
        `,
        variables: { first: first, skip: skip },
      });
      this.comics = [...this.comics, ...response.data.allComics];
      this.loading = false;
      if (response.data.allComics.length == 0) {
        this.haveMore = false;
      }
    },
  },
  head() {
    return {
      title: "漫画专区" + " - 蜂窝创作平台",
    };
  },
};
</script>