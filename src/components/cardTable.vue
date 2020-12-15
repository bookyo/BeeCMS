<template>
  <v-card>
    <v-card-title>{{title}}</v-card-title>
    <v-card-subtitle>最新发布</v-card-subtitle>
    <v-card-text>
      <v-data-table
        :headers="itemHeaders"
        :items="items"
        :options.sync="itemOptions"
        :server-items-length="totalItems"
        :loading="loading"
        :items-per-page="5"
        :footer-props="{
          itemsPerPageOptions: [5, 10, 15, 100],
        }"
        class="elevation-1"
      >
        <template v-slot:item.owner="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="30" color="primary">
              <span class="white--text">{{
                item.owner.name.substr(0, 1)
              }}</span>
            </v-avatar>
            <div class="ml-2">
              <nuxt-link :to="`/users/${item.owner.id}`">{{
                item.owner.name
              }}</nuxt-link>
            </div>
          </div>
        </template>
        <template v-slot:item.title="{ item }">
          <span>
            <nuxt-link :to="`/${type}s/${item.id}`">{{item.title}}</nuxt-link>
          </span>
        </template>
        <template v-slot:item.createdAt="{ item }">
          <span>{{ $moment(item.createdAt).fromNow() }}</span>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>
<script>
import gql from "graphql-tag";
export default {
  props: {
    type: String,
  },
  data() {
    return {
      totalItems: 0,
      items: [],
      loading: false,
      itemOptions: {},
      itemHeaders: [
        {
          text: "标题",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "发布用户", value: "owner", sortable: false },
        { text: "状态", value: "status", sortable: false },
        { text: "发布日期", value: "createdAt", sortable: false },
      ],
    };
  },
  computed: {
    title() {
      let title = '';
      switch (this.type) {
        case 'Video':
          title = '视频'
          break;
        case 'Comic':
          title = '漫画'
          break;
        case 'Novel':
          title = '小说'
          break;
        case 'Bee':
          title = '蜂窝号'
          break;
      
        default:
          break;
      }
      return title;
    }
  },
  watch: {
    itemOptions: {
      handler() {
        this.getItems();
      },
      deep: true,
    },
  },
  methods: {
    async getItems() {
      const { sortBy, sortDesc, page, itemsPerPage } = this.itemOptions;
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query get${this.type}s($first: Int, $skip: Int) {
            all${this.type}s(first: $first, skip: $skip, sortBy: createdAt_DESC) {
              id
              title
              status
              createdAt
              owner {
                id
                name
              }
            }
            _all${this.type}sMeta {
              count
            }
          }
        `,
        variables: { first: itemsPerPage, skip: (page - 1) * itemsPerPage },
        fetchPolicy: "no-cache",
      });
      this.items = response.data[`all${this.type}s`];
      this.totalItems = response.data[`_all${this.type}sMeta`].count;
      this.loading = false;
    },
  },
};
</script>