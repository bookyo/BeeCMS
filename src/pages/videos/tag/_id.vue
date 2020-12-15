<template>
  <v-row class="mx-auto">
    <v-col cols="12">
    <tab type="videos" :items="pushTag.tags"></tab>
    </v-col>
    <v-col cols="12" sm="3" v-for="video in videos" :key="video.id">
      <card type="videos" :cover="video.cover" :item="video"></card>
    </v-col>
    <v-col cols="12" class="text-center" v-if="haveMore">
      <v-btn @click="loadMore" :loading="loading" outlined color="primary">加载更多…</v-btn>
    </v-col>
  </v-row>
</template>

<script>
import gql from 'graphql-tag';
import card from '~/components/card';
import tab from '~/components/tab';
export default {
  async asyncData({app, params}) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getData($tagId: ID!) {
          allPushTags(where:{type:"video"}) {
            id
            tags {
              id
              title
            }
            type
          },
          Tag(where: { id: $tagId}) {
            id
            title
          },
          allVideos(first: 16, sortBy: createdAt_DESC, where: {tags_some: {id: $tagId}, status: "published"}) {
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
      variables: { tagId: id }
    });
    const videos = response.data.allVideos;
    const tag = response.data.Tag;
    let haveMore = true;
    if(videos.length<16) {
      haveMore = false;
    }
    const pushTag = response.data.allPushTags[0];
    return {
      tag,
      videos,
      haveMore,
      loading: false,
      page: 1,
      id,
      pushTag
    }
  },
  components: {
    card,
    tab
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
          query getNewVideos($first: Int, $skip: Int, $tagId: ID!) {
            allVideos(first: $first, skip: $skip, sortBy: createdAt_DESC, where: {tags_some: {id: $tagId}, status: "published"}) {
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
        variables: {first: first, skip: skip, tagId: this.id}
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
      title: `${this.tag.title} - 视频大全 - BeeCMS`
    }
  }
}
</script>