<template>
  <v-row class="mx-auto">
    <template v-if="limit">
      <v-col cols="12">
        <v-card>
          <v-img class="mx-auto" src="/tip.svg" max-width="600px"></v-img>
          <v-card-text>
            <h2 class="text-center">您当前用户组今日可发布内容已满！</h2>
          </v-card-text>
        </v-card>
      </v-col>
    </template>
    <template v-else>
      <v-col cols="12" md="8" class="mx-auto">
        <p class="text-center">添加《{{ novel.title }}》的章节</p>
        <v-text-field
          class="mb-3 mt-3"
          solo
          type="text"
          v-model="title"
          :rules="[rules.required]"
          label="本章标题"
          hint="输入本章节标题"
        ></v-text-field>
        <v-text-field
          class="mb-3"
          solo
          type="number"
          v-model="price"
          :rules="[
            (value) => !!value || value === 0 || '不能为空！',
            (value) => (value >= 0 && value <= 300) || '定价只能0到300之间！',
          ]"
          label="本章价格"
          hint="本章定价，0即为免费。"
        ></v-text-field>
        <editor
          style="background: #1e1e1e"
          class="mb-10"
          v-model="content"
        ></editor>
        <div class="text-center">
          <v-btn
            v-if="
              title.length && content.length > 5 && price >= 0 && price <= 300
            "
            class="text-center"
            color="primary"
            @click="addChapter"
            >提交</v-btn
          >
        </div>
      </v-col>
    </template>
  </v-row>
</template>

<script>
import { mdiPlus } from "@mdi/js";
import gql from "graphql-tag";
import editor from "~/components/editor";
import { filter, orderBy } from "lodash";
export default {
  data() {
    return {
      valid: false,
      files: [],
      finishUplaod: false,
      mdiPlus,
      title: "",
      price: 0,
      content: "<p>输入本章内容，支持markdown语法。</p>",
      newTag: null,
      tags: [],
      pushTags: [],
      rules: {
        required: (value) => !!value || "必填.",
        tagRule: (value) =>
          /^[\u4e00-\u9fa5A-Za-z0-9]{2,10}$/.test(value) ||
          "标签名只接收中文、英文和数字，且2个字符以上",
      },
      isLoading: false,
      menuProps: {
        disabled: false,
      },
      search: null,
      tagDialog: false,
      limit: false,
    };
  },
  components: {
    editor,
  },
  mounted() {
    this.checkLimit();
  },
  async asyncData({ app, params, query, store, redirect, error }) {
    const client = app.apolloProvider.defaultClient;
    const user = store.state.authUser;
    if (!user) {
      return error({
        message: "对不起，请登录！",
        status: 403,
      });
    }
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getPushTags($type: String, $id: ID!) {
          allPushTags(where: { type: $type }) {
            id
            tags {
              id
              title
            }
            type
          }
          Novel(where: { id: $id }) {
            id
            title
            content
            cover {
              id
              file {
                id
                publicUrl
              }
            }
            tags {
              id
              title
            }
          }
        }
      `,
      variables: { type: "novel", id: id },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const novel = response.data.Novel;
    if (pushTags.length) {
      tags = pushTags[0].tags;
      tags.push(...novel.tags);
    }
    return {
      tags,
      novel,
      id,
    };
  },
  methods: {
    async checkLimit() {
      const client = this.$apollo.getClient();
      const user = this.$store.state.authUser;
      const groupsResponse = await client.query({
        query: gql`
          query getGroups($userId: ID!) {
            allGroups {
              id
              needReview
              limitCreate
              score
            }
            User(where: { id: $userId }) {
              id
              score
            }
          }
        `,
        variables: { userId: user.id },
        fetchPolicy: "no-cache",
      });
      const groups = groupsResponse.data.allGroups;
      const theUser = groupsResponse.data.User;
      const theGroups = filter(groups, function (group) {
        return group.score <= theUser.score;
      });
      const orderGroups = orderBy(theGroups, ["score"], ["desc"]);
      const activeGroup = orderGroups[0];
      const today = new Date(new Date().toLocaleDateString()).toISOString();
      const getCounts = await client.query({
        query: gql`
          query getCounts($today: DateTime, $userId: ID!) {
            _allChaptersMeta(
              where: { owner: { id: $userId }, createdAt_gte: $today }
            ) {
              count
            }
          }
        `,
        variables: { userId: user.id, today: today },
      });
      const toadyChapterCounts = getCounts.data._allChaptersMeta.count;
      if (toadyChapterCounts >= activeGroup.limitCreate) {
        this.limit = true;
      }
    },
    addFile: function () {
      // this.novel.title = this.files[0].filenameWithoutExtension;
    },
    processFile: function () {
      this.finishUplaod = true;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addChapter() {
      const client = this.$apollo.getClient();
      const response = await client.mutate({
        mutation: gql`
          mutation createChapter(
            $novelId: ID!
            $title: String
            $price: Int
            $content: String
          ) {
            createChapter(
              data: {
                content: $content
                title: $title
                price: $price
                novel: { connect: { id: $novelId } }
              }
            ) {
              id
              novel {
                id
                chapters {
                  id
                  title
                }
              }
            }
          }
        `,
        variables: {
          title: this.title,
          price: this.price * 1,
          novelId: this.id,
          content: this.content,
        },
      });
      this.$router.push("/novels/" + this.id);
    },
  },
  head() {
    return {
      title: this.novel.title + " - 添加章节 - 蜂窝创作平台",
    };
  },
};
</script>

<style>
.uploader .filepond--drop-label {
  color: #fff;
}
.uploader .filepond--panel-root {
  border-radius: 0.5em;
  border: 1px solid #1e1e1e;
  background-color: #1e1e1e;
}
</style>