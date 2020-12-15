<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <tab type="videos" :items="pushTag.tags"></tab>
    </v-col>
    <v-col cols="12" sm="3" v-for="video in videos" :key="video.id">
      <card type="videos" :cover="video.cover" :item="video"></card>
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
          allPushTags(where: { type: "video" }) {
            id
            tags {
              id
              title
            }
            type
          }
          allVideos(first: $first, skip: $skip, sortBy: createdAt_DESC, where: { status: "published" }) {
            id
            title
            createdAt
            owner {
              id
              name
            }
            cover
          }
        }
      `,
      variables: {
        first: 16,
        skip: 0,
      },
    });
    let haveMore = true;
    const videos = response.data.allVideos;
    if (videos.length < 16) {
      haveMore = false;
    }
    const pushTag = response.data.allPushTags[0];
    return {
      videos,
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
          query getNewVideos($first: Int, $skip: Int) {
            allVideos(first: $first, skip: $skip ,sortBy: createdAt_DESC, where: { status: "published" }) {
              id
              title
              createdAt
              owner {
                id
                name
              }
              cover
            }
          }
        `,
        variables: {first: first, skip: skip}
      });
      this.videos = [...this.videos, ...response.data.allVideos];
      this.loading = false;
      if(response.data.allVideos.length == 0) {
        this.haveMore = false;
      }
    },
  },
  head() {
    return {
      title: `视频专区 - BeeCMS`
    }
  }
};
</script>