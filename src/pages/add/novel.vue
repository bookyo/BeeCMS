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
      <v-col cols="12" md="12" class="mx-auto">
        <div class="uploader">
          <no-ssr>
            <file-pond
              name="uploadCover"
              ref="pond"
              label-idle="拖放封面图到这里、或点击 <span class='filepond--label-action'>浏览</span>"
              :allow-multiple="false"
              :allow-remove="true"
              :allow-reorder="true"
              imageResizeTargetWidth="600"
              imageResizeMode='contain'
              imageTransformOutputMimeType="image/jpeg"
              imageTransformOutputQuality="87"
              accepted-file-types="image/*"
              v-model="files"
              @init="handleFilePondInit"
              @addfile="addFile"
            />
          </no-ssr>
        </div>
      </v-col>
      <v-col cols="12" md="12" class="mx-auto">
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-text-field
            class="mb-3"
            solo
            type="text"
            v-model="novel.title"
            :rules="[rules.required]"
            label="标题"
            hint="输入标题"
          ></v-text-field>
          <v-textarea
            class="mb-3"
            solo
            type="text"
            v-model="novel.content"
            :rules="[rules.required]"
            label="小说简介"
            hint="输入小说简介"
          ></v-textarea>
          <v-autocomplete
            v-model="novel.tags"
            :items="tags"
            :loading="isLoading"
            :search-input.sync="search"
            :counter="5"
            :menu-props="menuProps"
            :rules="[
              (value) => !!value.length || '必填.',
              (value) => value.length <= 5 || '只能最多添加5个标签！',
            ]"
            hide-selected
            hide-no-data
            solo
            chips
            deletable-chips
            multiple
            label="搜索并添加标签"
            hint="若搜索无果，可点+号添加标签"
            item-text="title"
            item-value="id"
            return-object
            cache-items
          >
            <template v-slot:append-outer>
              <v-icon @click="tagDialog = true">{{ mdiPlus }}</v-icon>
            </template>
          </v-autocomplete>
          <div class="d-flex">
            <v-btn class="primary" :loading="loading" @click="addNovel" :disabled="!valid"
              >提交</v-btn
            >
          </div>
        </v-form>
      </v-col>
      <v-dialog v-model="tagDialog" persistent max-width="600px">
        <v-card>
          <v-card-title>添加标签</v-card-title>
          <v-card-text>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    type="text"
                    v-model="newTag"
                    :rules="[rules.required, rules.tagRule]"
                    label="标签名"
                    hint="输入标签名"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" text @click="addTag()">添加</v-btn>
            <v-btn color="red" text @click="tagDialog = false">取消</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-row>
</template>
<script>
import { mdiPlus } from "@mdi/js";
import axios from "axios";
// Import Vue FilePond
import vueFilePond, { setOptions } from "vue-filepond";
// Import FilePond styles
import "filepond/dist/filepond.min.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
// Import the plugin code
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImageCrop from "filepond-plugin-image-crop";
import FilePondPluginImageResize from "filepond-plugin-image-resize";
import FilePondPluginImageTransform from "filepond-plugin-image-transform";
// Import the plugin styles
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import gql from "graphql-tag";
import { filter, orderBy } from "lodash";
let publicUrl;
setOptions({
  server: {
    // Called for each file upload
    process: (fieldName, file, metadata, load, error, progress, abort) => {
      // Your custom processing method here
      // fieldName is the name of the input field
      // file is the actual file object to send
      const createImage = `mutation createImage($file: Upload!) {
        createImage(data: { file: $file }) {
          id
          file {
            id
            publicUrl
          }
        }
      }`;
      let operation = {
        query: createImage,
        variables: {
          file: null,
        },
      };
      let map = {
        0: ["variables.file"],
      };
      let formData = new FormData();
      formData.append("operations", JSON.stringify(operation));
      formData.append("map", JSON.stringify(map));
      formData.append(0, file);
      axios({
        method: "POST",
        url: "/admin/api",
        data: formData,
        onUploadProgress: function (e) {
          progress(e.lengthComputable, e.loaded, e.total);
        },
      })
        .then(function (res) {
          load(res.data.data.createImage.id);
        })
        .catch(function (err) {
          error("oh no");
        });

      // Should expose an abort method so the request can be cancelled
      return {
        abort: () => {
          // This function is entered if the user has tapped the cancel button
          request.abort();

          // Let FilePond know the request has noveln cancelled
          abort();
        },
      };
    },
  },
});
// Create component
const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginImageCrop,
  FilePondPluginImageResize,
  FilePondPluginImageTransform
);
export default {
  data() {
    return {
      valid: false,
      files: [],
      mdiPlus,
      novel: {
        title: "",
        content: "",
        tags: [],
      },
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
      loading: false,
      menuProps: {
        disabled: false,
      },
      search: null,
      tagDialog: false,
      limit: false,
    };
  },
  components: {
    FilePond,
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
    const response = await client.query({
      query: gql`
        query getPushTags($type: String) {
          allPushTags(where: { type: $type }) {
            id
            tags {
              id
              title
            }
            type
          }
        }
      `,
      variables: { type: "novel" },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    if (pushTags.length) {
      tags = pushTags[0].tags;
    }
    return { tags };
  },
  watch: {
    search(val) {
      val && val !== this.select && val.length > 1 && this.getTags(val);
    },
  },
  mounted() {
    this.checkLimit();
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
            _allNovelsMeta(
              where: { owner: { id: $userId }, createdAt_gte: $today }
            ) {
              count
            }
          }
        `,
        variables: { userId: user.id, today: today },
      });
      const toadyNovelCounts = getCounts.data._allNovelsMeta.count;
      if (toadyNovelCounts >= activeGroup.limitCreate) {
        this.limit = true;
      }
    },
    addFile: function () {
      console.log(this.files[0]);
      // this.novel.title = this.files[0].filenameWithoutExtension;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addNovel() {
      const file = this.$refs.pond.getFile();
      let imageId = null;
      console.log(file);
      if (file) {
        imageId = file.serverId;
      }
      const client = this.$apollo.getClient();
      if (this.$refs.form.validate()) {
        if (!imageId) {
          this.$notify.toast("小说必须上传封面！");
          return;
        }
        if (this.novel.content.length < 5) {
          this.$notify.toast("内容不能少于5个字！");
          return;
        }
        this.loading = true;
        const user = this.$store.state.authUser;
        try {
          const response = await client.mutate({
            mutation: gql`
              mutation createNovel(
                $title: String
                $content: String
                ${imageId ? "$imageId: ID!" : ""}
                $tagsId: [TagWhereUniqueInput]
              ) {
                createNovel(
                  data: {
                    title: $title
                    content: $content
                    cover: ${imageId ? "{ connect: {id: $imageId} }" : null}
                    tags: { connect: $tagsId }
                  }
                ) {
                  id
                  title
                  content
                }
              }
            `,
            variables: {
              title: this.novel.title,
              content: this.novel.content,
              imageId: imageId,
              tagsId: this.novel.tags.map((tag) => ({ id: tag.id })),
            },
          });
          this.loading = false;
          this.$router.push("/novels/" + response.data.createNovel.id);
        } catch (error) {
          console.log(error);
          this.$notify.toast(error.message);
          this.loading = false;
        }
      }
    },
    async getTags(val) {
      this.isLoading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getTags($key: String) {
            allTags(where: { title_contains_i: $key }) {
              id
              title
            }
          }
        `,
        variables: { key: val },
      });
      this.tags = response.data.allTags;
      this.isLoading = false;
    },
    async addTag() {
      if (
        !this.newTag ||
        !/^[\u4e00-\u9fa5A-Za-z0-9]{2,10}$/.test(this.newTag)
      ) {
        this.$notify.toast("对不起，标签名不符合规则！");
      }
      const client = this.$apollo.getClient();
      try {
        const response = await client.mutate({
          mutation: gql`
            mutation createTag($title: String) {
              createTag(data: { title: $title }) {
                id
                title
              }
            }
          `,
          variables: { title: this.newTag },
        });
        const data = response.data.createTag;
        this.tags.push(data);
        this.tagDialog = false;
      } catch (error) {
        if (error.message.indexOf("duplicate key error") > -1) {
          this.$notify.toast("已经存在此标签，请直接搜索添加！");
        }
      }
    },
  },
  head() {
    return {
      title: "发布小说/教程",
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