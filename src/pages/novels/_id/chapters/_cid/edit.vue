<template>
  <v-row class="mx-auto">
    <v-col cols="12" md="8" class="mx-auto">
      <p class="text-center">修改《{{ novel.title }}》的{{chapter.title}}</p>
      <v-text-field
        class="mb-3 mt-3"
        solo
        type="text"
        v-model="chapter.title"
        :rules="[rules.required]"
        label="本章标题"
        hint="输入本章节标题"
      ></v-text-field>
      <v-text-field
        class="mb-3"
        solo
        type="number"
        v-model="chapter.price"
        :rules="[
          (value) => !!value || value === 0 || '不能为空！',
          (value) => (value >= 0 && value <= 300) || '定价只能0到300之间！',
        ]"
        label="本章价格"
        hint="本章定价，0即为免费。"
      ></v-text-field>
      <editor
        style="background: #1E1E1E"
        class="mb-10"
        v-model="chapter.content"
      ></editor>
      <div class="text-center">
      <v-btn
        v-if="chapter.title.length && chapter.content.length>5 && chapter.price >= 0 && chapter.price <= 300"
        class="text-center"
        color="primary"
        @click="updateChapter"
        >提交</v-btn
      >
      </div>
    </v-col>
  </v-row>
</template>

<script>
import { mdiPlus } from "@mdi/js";
import gql from "graphql-tag";
import editor from "~/components/editor";
export default {
  data() {
    return {
      valid: false,
      files: [],
      finishUplaod: false,
      mdiPlus,
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
    };
  },
  components: {
    editor,
  },
  mounted() {},
  async asyncData({ app, params, query, store, redirect }) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const cid = params.cid;
    const response = await client.query({
      query: gql`
        query getPushTags($type: String, $id: ID!, $cid: ID!) {
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
          Chapter(where: {id: $cid}) {
            id
            title
            content
            price
          }
        }
      `,
      variables: { type: "novel", id: id, cid: cid },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const novel = response.data.Novel;
    const chapter = response.data.Chapter;
    if (pushTags.length) {
      tags = pushTags[0].tags;
      tags.push(...novel.tags);
    }
    return {
      tags,
      novel,
      chapter,
      id,
      cid
    };
  },
  methods: {
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
    async updateChapter() {
      const client = this.$apollo.getClient();
      const response = await client.mutate({
        mutation: gql`
          mutation updateChapter(
            $cid: ID!
            $title: String
            $price: Int
            $content: String
          ) {
            updateChapter(
              id: $cid
              data: {
                content: $content
                title: $title
                price: $price
              }
            ) {
              id
              content
              title
              price
            }
          }
        `,
        variables: {
          title: this.chapter.title,
          price: this.chapter.price * 1,
          cid: this.cid,
          content: this.chapter.content,
        },
      });
      this.$router.push("/novels/" + this.id + '/chapters/' + this.cid);
    },
  },
  head() {
    return {
      title: this.novel.title + ' - ' + this.chapter.title + ' - 编辑 - 蜂窝创作平台'
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