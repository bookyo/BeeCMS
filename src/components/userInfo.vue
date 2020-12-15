<template>
  <v-list-item two-line class="pa-0">
    <nuxt-link :to="`/users/${user.id}`" style="color: white">
      <v-list-item-avatar color="grey darken-3">
        <span>{{ user.name.substring(0, 1) }}</span>
      </v-list-item-avatar>
    </nuxt-link>
    <v-list-item-content>
      <v-list-item-title>{{ user.name }}</v-list-item-title>
      <v-list-item-subtitle
        >发布于 {{ $moment(createdAt).fromNow() }}</v-list-item-subtitle
      >
    </v-list-item-content>
    <v-list-item-action>
      <v-btn @click="follow">{{ isFollow ? "已关注" : "关注" }}</v-btn>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
import gql from "graphql-tag";
export default {
  props: {
    user: Object,
    createdAt: String,
  },
  data() {
    return {
      isFollow: false,
      followObj: null
    };
  },
  mounted() {
    this.checkFollow();
  },
  methods: {
    async checkFollow() {
      const client = this.$apollo.getClient();
      const authUser = this.$store.state.authUser;
      if(!authUser) {
        return;
      }
      const response = await client.query({
        query: gql`
          query getFollow($userId: ID!, $followId: ID!) {
            allFollows(
              first: 1
              where: { followTo: { id: $followId }, followBy: { id: $userId } }
            ) {
              id
            }
          }
        `,
        variables: {
          userId: this.$store.state.authUser.id,
          followId: this.user.id,
        },
      });
      if (response.data.allFollows.length) {
        this.isFollow = true;
        this.followObj = response.data.allFollows[0];
      }
    },
    async follow() {
      const client = this.$apollo.getClient();
      const authUser = this.$store.state.authUser;
      if(!authUser) {
        this.$notify.toast('请先登录！');
        return;
      }
      try {
        if (!this.isFollow) {
          const response = await client.mutate({
            mutation: gql`
            mutation createFollow($id: ID!) {
              createFollow(data: {followTo: {connect: {id: $id}}}) {
                id
              }
            }
          `,
            variables: { id: this.user.id },
          });
          this.$notify.toast('恭喜您，关注用户成功！');
          this.isFollow = true;
          this.followObj = response.data.createFollow;
        } else {
          await client.mutate({
            mutation: gql`
            mutation deleteFollow($id: ID!) {
              deleteFollow(id: $id) {
                id
              }
            }
          `,
            variables: { id: this.followObj.id },
          });
          this.$notify.toast('取消关注成功！');
          this.isFollow = false;
          this.followObj = null;
        }
      } catch (error) {
        this.$notify.toast(error.message);
      }
    },
  },
};
</script>