<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <tab type="novels" :items="pushTag.tags"></tab>
    </v-col>
    <v-col cols="12" sm="3" v-for="novel in novels" :key="novel.id">
      <card type="novels" :cover="novel.cover.file.publicUrl" :item="novel"></card>
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
  async asyncData({ app,params }) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getData($first: Int, $skip: Int, $tagId: ID!) {
          allPushTags(where: { type: "novel" }) {
            id
            tags {
              id
              title
            }
            type
          }
          Tag(where: {id: $tagId}) {
              id
              title
          }
          allNovels(where: { tags_some: {id: $tagId}, status: "published" },first: $first, skip: $skip, sortBy: createdAt_DESC) {
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
      variables: {
        first: 16,
        skip: 0,
        tagId: id
      },
    });
    let haveMore = true;
    const novels = response.data.allNovels;
    const tag = response.data.Tag;
    if (novels.length < 16) {
      haveMore = false;
    }
    const pushTag = response.data.allPushTags[0];
    return {
        tag,
      novels,
      haveMore,
      loading: false,
      page: 1,
      id,
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
          query getNewNovels($first: Int, $skip: Int, $tagId: ID!) {
            allNovels(first: $first, skip: $skip ,sortBy: createdAt_DESC, where: { tags_some: {id: $tagId}, status: "published" }) {
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
        variables: {first: first, skip: skip, tagId: id}
      });
      this.novels = [...this.novels, ...response.data.allNovels];
      this.loading = false;
      if(response.data.allNovels.length == 0) {
        this.haveMore = false;
      }
    },
  },
  head() {
    return {
      title: this.tag.title + ' - 小说专区 - 蜂窝创作平台'
    }
  }
};
</script>