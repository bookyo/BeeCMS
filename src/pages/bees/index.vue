<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <tab type="bees" :items="pushTag.tags"></tab>
    </v-col>
    <v-col cols="12" sm="3" v-for="bee in bees" :key="bee.id">
      <card type="bees" :cover="bee.cover.file.publicUrl" :item="bee"></card>
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
          allPushTags(where: { type: "bee" }) {
            id
            tags {
              id
              title
            }
            type
          }
          allBees(first: $first, skip: $skip, sortBy: createdAt_DESC, where: {status: "published"}) {
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
    const bees = response.data.allBees;
    if (bees.length < 16) {
      haveMore = false;
    }
    const pushTag = response.data.allPushTags[0];
    return {
      bees,
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
          query getNewbees($first: Int, $skip: Int) {
            allBees(first: $first, skip: $skip, sortBy: createdAt_DESC, where: {status: "published"}) {
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
        variables: { first: first, skip: skip },
      });
      this.bees = [...this.bees, ...response.data.allBees];
      this.loading = false;
      if (response.data.allBees.length == 0) {
        this.haveMore = false;
      }
    },
  },
  head() {
    return {
      title: '蜂窝号自媒体' + ' - 蜂窝创作平台'
    }
  }
};
</script>