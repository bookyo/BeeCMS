<template>
  <v-row class="mx-auto" justify="center">
    <v-col
      cols="12"
    >
      <v-card :style="xsStyle">
        <v-breadcrumbs :items="items"></v-breadcrumbs>
      </v-card>
    </v-col>
    <v-col cols="12" sm="8">
      <v-card :style="xsStyle">
        <v-card-title
          ><h1 class="text-h6">{{ bee.title }}</h1></v-card-title
        >
        <v-card-subtitle>
          <userInfo :user="bee.owner" :createdAt="bee.createdAt"> </userInfo>
        </v-card-subtitle>
        <v-card-text>
          <div v-html="bee.content"></div>
          <div v-if="allowRead" v-html="bee.paidContent"></div>
          <div v-else class="order-warning">
            <p>本内容需要点数付费购买，所需积分为：{{ bee.price }}</p>
            <v-btn @click="pointOrder">点击购买</v-btn>
          </div>
        </v-card-text>
      </v-card>
      <v-card :style="xsStyle" class="mt-5" v-if="$vuetify.breakpoint.xsOnly">
        <v-card-title>相关蜂窝号推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="bee in randomBees"
            :key="bee.id"
            :item="bee"
            type="bees"
          >
          </side-card>
        </v-card-text>
      </v-card>
      <v-card class="mt-5" :style="xsStyle">
        <v-card-title>评论区</v-card-title>
        <v-card-text> 暂未开放 </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="4" class="d-none d-sm-block">
      <v-card>
        <v-card-title>相关蜂窝号推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="bee in randomBees"
            :key="bee.id"
            :item="bee"
            type="bees"
          >
          </side-card>
        </v-card-text>
      </v-card>
    </v-col>
    <floatMenu :item="bee" type="bee"></floatMenu>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import { findIndex } from "lodash";
import sideCard from "~/components/sideCard";
import floatMenu from "~/components/floatMenu";
import userInfo from "~/components/userInfo";
import { mdiStarCircleOutline } from "@mdi/js";
export default {
  async asyncData({ app, params, store, error }) {
    const id = params.id;
    const client = app.apolloProvider.defaultClient;
    const response = await client.query({
      query: gql`
        query getData($id: ID!) {
          Bee(where: { id: $id }) {
            id
            title
            content
            price
            paidContent
            createdAt
            status
            owner {
              id
              name
            }
            tags {
              id
              title
            }
          }
        }
      `,
      variables: { id: id },
      errorPolicy: "all",
      fetchPolicy: "no-cache",
    });
    const bee = response.data.Bee;
    const user = store.state.authUser;
    if(bee.status!='published') {
      if(!user) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
      if(user.id != bee.owner.id && !user.isAdmin) {
        return error({
          message: '本内容审核中或暂不对外公开！',
          status: 404,
        });
      }
    };
    let allowRead = true;
    if (bee.price > 0) {
      if (!user) {
        allowRead = false;
      } else {
        if (user.id == bee.owner.id) {
          allowRead = true;
        } else {
          const orderResponse = await client.query({
            query: gql`
              query getPointOrder($typeId: String, $userId: ID!) {
                allPointOrders(
                  where: {
                    typeId: $typeId
                    type: "Bee"
                    owner: { id: $userId }
                  }
                ) {
                  id
                }
              }
            `,
            variables: { typeId: bee.id, userId: user.id },
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
    return {
      allowRead,
      bee,
      user: store.state.authUser,
      randomBees: [],
      items: [
        {
          text: "首页",
          disabled: false,
          exact: true,
          to: `/`,
        },
        {
          text: "蜂窝号",
          disabled: false,
          exact: true,
          to: `/bees`,
        },
        {
          text: bee.title,
          disabled: true,
          to: `/bees/${id}`,
        },
      ],
    };
  },
  components: {
    sideCard,
    userInfo,
    floatMenu,
  },
  computed: {
    xsStyle() {
      return this.$vuetify.breakpoint.xsOnly
            ? 'max-width: calc(100% + 48px);margin-left: calc(-24px);margin-right: calc(-24px);'
            : ''
    }
  },
  async mounted() {
    this.getRandomBees();
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
            title: "确定花费" + this.bee.price + "购买此内容？",
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
                    createPointOrder(data: { type: "Bee", typeId: $typeId }) {
                      id
                    }
                  }
                `,
                variables: { typeId: root.bee.id },
              });
              const contentResponse = await client.query({
                query: gql`
                  query getContent($id: ID!) {
                    Bee(where: { id: $id }) {
                      id
                      paidContent
                    }
                  }
                `,
                variables: { id: root.bee.id },
                fetchPolicy: "no-cache",
              });
              root.bee.paidContent = contentResponse.data.Bee.paidContent;
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
    async getRandomBees() {
      const client = this.$apollo.getClient();
      const tags = this.bee.tags;
      let tagsId = [];
      tags.forEach(function (tag) {
        tagsId.push(tag.id);
      });
      const countReponse = await client.query({
        query: gql`
          query getCount($tagsId: [ID]) {
            _allBeesMeta(where: { tags_some: { id_in: $tagsId }, status: "published" }) {
              count
            }
          }
        `,
        variables: { tagsId: tagsId },
      });
      const count = countReponse.data._allBeesMeta.count;
      const first = 12;
      let skip = Math.floor(Math.random() * (count - first));
      if (skip < 0) {
        skip = 0;
      }
      const response = await client.query({
        query: gql`
          query getRandomBees($first: Int, $skip: Int, $tagsId: [ID]) {
            allBees(
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
      const bees = response.data.allBees;
      this.randomBees = bees;
    },
  },
  head() {
    return {
      title: this.bee.title + ' - 蜂窝号自媒体 - 蜂窝创作平台'
    };
  },
};
</script>