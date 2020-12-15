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
      <v-col cols="12" md="6" class="mx-auto text-center">
        <div class="uploader">
          <p>添加《{{ comic.title }}》的章节</p>
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
          <no-ssr>
            <file-pond
              name="uploadCover"
              ref="pond"
              label-idle="拖放漫画到这里，或点击 <span class='filepond--label-action'>浏览</span>，一话最多50张图片，单张图片不超过2MB，可拖动图片调整顺序。"
              :allow-multiple="true"
              :allow-remove="true"
              :allow-reorder="true"
              maxParallelUploads="10"
              maxFileSize="2MB"
              maxFiles="50"
              filePosterMaxHeight="256"
              accepted-file-types="image/*"
              v-model="files"
              :server="server"
              @init="handleFilePondInit"
              @addfile="addFile"
              @processfile="processFile"
            />
          </no-ssr>
        </div>
        <v-btn
          v-if="title.length && files.length && price >= 0 && price <= 300"
          class="text-center"
          color="primary"
          @click="addChapter"
          >提交</v-btn
        >
      </v-col>
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
// Import the plugin styles
// Import the plugin code
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
// Import the plugin styles
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import gql from "graphql-tag";
import { filter, orderBy, sortBy } from "lodash";
let publicUrl;
// Create component
const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginFilePoster,
  FilePondPluginFileValidateSize,
  FilePondPluginImagePreview
);
setOptions({
  itemInsertLocation: (a, b) => {
    // If no file data yet, treat as equal
    if (!(a.file && b.file)) return 0;

    // Move to right location in list
    if (a.filenameWithoutExtension < b.filenameWithoutExtension) {
      return -1;
    } else if (a.filenameWithoutExtension > b.filenameWithoutExtension) {
      return 1;
    }

    return 0;
  },
});
export default {
  data() {
    return {
      valid: false,
      files: [],
      finishUplaod: false,
      mdiPlus,
      title: "",
      price: 0,
      newTag: null,
      tags: [],
      pushTags: [],
      rules: {
        required: (value) => !!value || "必填.",
        tagRule: (value) =>
          /^[\u4e00-\u9fa5A-Za-z0-9]{2,10}$/.test(value) ||
          "标签名只接收中文、英文和数字，且2个字符以上",
      },
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
          formData.append(0, file, file.name);
          axios({
            method: "POST",
            url: "/admin/api",
            data: formData,
            dataType: "JSON",
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

              // Let FilePond know the request has comicn cancelled
              abort();
            },
          };
        },
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
    FilePond,
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
          Comic(where: { id: $id }) {
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
      variables: { type: "comic", id: id },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const comic = response.data.Comic;
    if (pushTags.length) {
      tags = pushTags[0].tags;
      tags.push(...comic.tags);
    }
    return {
      tags,
      comic,
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
            _allComicChaptersMeta(
              where: { owner: { id: $userId }, createdAt_gte: $today }
            ) {
              count
            }
          }
        `,
        variables: { userId: user.id, today: today },
      });
      const toadyComicChaptersCounts =
        getCounts.data._allComicChaptersMeta.count;
      if (toadyComicChaptersCounts >= activeGroup.limitCreate) {
        this.limit = true;
      }
    },
    addFile: function () {
      // this.comic.title = this.files[0].filenameWithoutExtension;
    },
    processFile: function () {
      this.finishUplaod = true;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addChapter() {
      let files = this.$refs.pond.getFiles();
      let imageIds = [];
      files.forEach(function (file) {
        imageIds.push({ id: file.serverId });
      });
      const client = this.$apollo.getClient();
      const response = await client.mutate({
        mutation: gql`
          mutation createChapter(
            $imageIds: [ImageWhereUniqueInput]
            $comicId: ID!
            $title: String
            $price: Int
          ) {
            createComicChapter(
              data: {
                images: { connect: $imageIds }
                title: $title
                price: $price
                comic: { connect: { id: $comicId } }
              }
            ) {
              id
            }
          }
        `,
        variables: {
          title: this.title,
          price: this.price * 1,
          comicId: this.id,
          imageIds: imageIds,
        },
      });
      this.$router.push("/comics/" + this.id);
    },
  },
  head() {
    return {
      title: this.comic.title + " - 添加章节 - 蜂窝创作平台",
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