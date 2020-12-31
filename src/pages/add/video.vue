<template>
  <v-row class="mx-auto">
    <template v-if="limit">
      <v-col cols="12">
        <v-card>
          <v-img class="mx-auto" src="/tip.svg" max-width="600px"></v-img>
          <v-card-text>
            <h2 class="text-center">您当前用户组今日可发布视频/分集已满！</h2>
          </v-card-text>
        </v-card>
      </v-col>
    </template>
    <template v-else>
      <v-col cols="12" md="8" class="mx-auto">
        <div class="uploader">
          <no-ssr>
            <file-pond
              name="uploadVideo"
              ref="pond"
              label-idle="拖放视频到这里、或点击 <span class='filepond--label-action'>浏览</span>"
              :allow-multiple="false"
              :allow-remove="true"
              :allow-reorder="true"
              :server="server"
              label-file-type-not-allowed="上传失败，视频格式有误"
              file-validate-type-label-expected-types="File of invalid type"
              :fileValidateTypeDetectType="fileTypeDetect"
              v-model="files"
              @init="handleFilePondInit"
              @addfile="addFile"
              @processfile="processFile"
            />
          </no-ssr>
        </div>
      </v-col>
      <v-col cols="12" md="8" class="mx-auto" v-if="files.length">
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-text-field
            class="mb-3"
            solo
            type="text"
            v-model="video.title"
            :rules="[rules.required]"
            label="视频标题"
            hint="输入视频标题"
          ></v-text-field>
          <v-textarea
            class="mb-3"
            solo
            type="text"
            v-model="video.content"
            :rules="[rules.required]"
            label="视频简介"
            hint="输入视频简介"
          ></v-textarea>
          <v-text-field
            class="mb-3"
            solo
            type="number"
            min="0"
            max="300"
            v-model="video.price"
            :rules="[
              (value) => !!value || value === 0 || '不能为空！',
              (value) => (value >= 0 && value <= 300) || '定价只能0到300之间！',
            ]"
            label="视频定价"
            hint="视频定价，如果为0则为公开播放"
          ></v-text-field>
          <v-autocomplete
            v-model="video.tags"
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
            <v-btn class="primary" :loading="loading" @click="addVideo" :disabled="!valid"
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

import gql from "graphql-tag";
import { filter, orderBy } from "lodash";
// Create component
const FilePond = vueFilePond(FilePondPluginFileValidateType);
export default {
  data() {
    return {
      valid: false,
      files: [],
      finishUplaod: false,
      mdiPlus,
      video: {
        title: "",
        content: "",
        tags: [],
        price: null,
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
      server: {
        // Called for each file upload
        process: (fieldName, file, metadata, load, error, progress, abort) => {
          // Your custom processing method here
          // fieldName is the name of the input field
          // file is the actual file object to send
          fetch("/admin/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: `{ "query": "query getUrl($name: String!) { preSignUrl(name: $name) }", "variables":{"name":"${file.name}"} }`,
          })
            .then((x) => x.json())
            .then(({ data }) => {
              const putUrl = data.preSignUrl;
              console.log(putUrl);
              // console.log(file);
              axios
                .put(putUrl, file, {
                  headers: { "Content-Type": file.type },
                  onUploadProgress: function (e) {
                    progress(e.lengthComputable, e.loaded, e.total);
                  },
                })
                .then(function (res) {
                  load(file.name);
                })
                .catch(function (err) {
                  error("oh no");
                });

              // Should expose an abort method so the request can be cancelled
              return {
                abort: () => {
                  // This function is entered if the user has tapped the cancel button
                  request.abort();

                  // Let FilePond know the request has been cancelled
                  abort();
                },
              };
            });
        },
      },
    };
  },
  mounted() {
    this.checkLimit();
  },
  async asyncData({ app, params, query, store, error, redirect }) {
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
      variables: { type: "video" },
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
  methods: {
    fileTypeDetect: (source, type) => new Promise((resolve, reject) => {
      const nameArr = source.name.split('.');
      const extension = nameArr[nameArr.length - 1];
      if(extension.toUpperCase() == 'FLV'||extension.toUpperCase() == 'RMVB'||extension.toUpperCase() == 'RM'||extension.toUpperCase() == 'AVI'||extension.toUpperCase() == 'MPG'||extension.toUpperCase() == 'MPEG'||extension.toUpperCase() == 'WMV'||extension.toUpperCase() == 'MKV'||extension.toUpperCase() == 'VOB') {
        return resolve('video/whitelist');
      }
      // Do custom type detection here and return with promise
      resolve(type);
    }),
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
            _allVideosMeta(
              where: { owner: { id: $userId }, createdAt_gte: $today }
            ) {
              count
            }
            _allEpisodesMeta(
              where: { owner: { id: $userId }, createdAt_gte: $today }
            ) {
              count
            }
          }
        `,
        variables: { userId: user.id, today: today },
      });
      const toadyVideoCounts = getCounts.data._allVideosMeta.count;
      const toadyEpisodeCounts = getCounts.data._allEpisodesMeta.count;
      if (toadyVideoCounts >= activeGroup.limitCreate) {
        this.limit = true;
      }
      if (toadyEpisodeCounts >= activeGroup.limitCreate) {
        this.limit = true;
      }
    },
    addFile: function () {
      console.log(this.files[0]);
      this.video.title = this.files[0].filenameWithoutExtension;
    },
    processFile: function (e) {
      this.finishUplaod = true;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addVideo() {
      const client = this.$apollo.getClient();
      if (!this.finishUplaod) {
        this.$notify.toast("请等待视频上传完成！");
        return;
      }
      if (this.$refs.form.validate()) {
        this.loading = true;
        const user = this.$store.state.authUser;
        try {
          const response = await client.mutate({
            mutation: gql`
              mutation createVideo(
                $title: String
                $content: String
                $price: Int
                $path: String
                $tagsId: [TagWhereUniqueInput]
              ) {
                createVideo(
                  data: {
                    title: $title
                    content: $content
                    episodes: {
                      create: { title: "ep1", path: $path, price: $price }
                    }
                    tags: { connect: $tagsId }
                  }
                ) {
                  id
                }
              }
            `,
            variables: {
              title: this.video.title,
              content: this.video.content,
              price: this.video.price * 1,
              path: this.files[0].file.name,
              tagsId: this.video.tags.map((tag) => ({ id: tag.id })),
            },
          });
          console.log(response.data.createVideo);
          this.loading = false;
          this.$router.push("/videos/" + response.data.createVideo.id);
        } catch (error) {
          console.log(error);
          if (error.message.indexOf("Nested errors occurred") > -1) {
            this.$notify.toast("您目前每天所能发布视频或视频分集已满！");
          } else {
            this.$notify.toast(error.message);
          }
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
  components: {
    FilePond,
  },
  head() {
    return {
      title: "发布视频",
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