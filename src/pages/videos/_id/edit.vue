<template>
  <v-row class="mx-auto">
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
            filePosterMaxHeight="256"
            imageResizeTargetWidth="600"
            imageResizeMode='contain'
            imageTransformOutputMimeType="image/jpeg"
            imageTransformOutputQuality="87"
            accepted-file-types="image/*"
            v-model="files"
            :files="oldFiles"
            :server="server"
            @init="handleFilePondInit"
            @addfile="addFile"
            @processfile="processFile"
          />
        </no-ssr>
      </div>
    </v-col>
    <v-col cols="12" md="12" class="mx-auto" v-if="files.length">
      <v-form ref="form" v-model="valid" lazy-validation>
        <v-text-field
          class="mb-3"
          solo
          type="text"
          v-model="video.title"
          :rules="[rules.required]"
          label="标题"
          hint="输入标题"
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
          <v-btn class="primary" @click="addvideo" :disabled="!valid"
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
// Import the plugin code
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
// Import the plugin styles
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import gql from "graphql-tag";
let publicUrl;
// Create component
const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginFilePoster,
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
      finishUplaod: false,
      mdiPlus,
      newTag: null,
      tags: [],
      pushTags: [],
      files: [],
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
              load(res.data.data.createImage.file.publicUrl);
            })
            .catch(function (err) {
              error("oh no");
            });

          // Should expose an abort method so the request can be cancelled
          return {
            abort: () => {
              // This function is entered if the user has tapped the cancel button
              request.abort();

              // Let FilePond know the request has videon cancelled
              abort();
            },
          };
        },
      },
    };
  },
  components: {
    FilePond,
  },
  mounted() {
  },
  async asyncData({ app, params, query, store, redirect }) {
    const client = app.apolloProvider.defaultClient;
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
          Video(where: { id: $id }) {
            id
            title
            content
            cover
            tags {
              id
              title
            }
          }
        }
      `,
      variables: { type: "video", id: id },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const video = response.data.Video;
    if (pushTags.length) {
      tags = pushTags[0].tags;
      tags.push(...video.tags);
    }
    return {
      tags,
      video,
      oldFiles: [
        {
          // the server file reference
          source: video.cover,
          serverId: video.cover,
          // set type to local to indicate an already uploaded file
          options: {
            type: "local",

            // pass poster property
            metadata: {
              poster: video.cover,
            },
          },
        },
      ],
    };
  },
  watch: {
    search(val) {
      val && val !== this.select && val.length > 1 && this.getTags(val);
    },
  },
  methods: {
    addFile: function () {
      console.log(this.files[0]);
      // this.video.title = this.files[0].filenameWithoutExtension;
    },
    processFile: function () {
      this.finishUplaod = true;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      console.log(this.$refs.pond);
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addvideo() {
      const file = this.$refs.pond.getFile();
      let image = null;
      if (file) {
        image = file.serverId;
      }
      const client = this.$apollo.getClient();
      const isOld = file.source == this.video.cover;
      if (
        file.source != this.video.cover &&
        !this.finishUplaod
      ) {
        this.$notify.toast("请等待海报上传完成！");
      }
      if (this.$refs.form.validate()) {
        if (!image) {
          this.$notify.toast("视频节目必须上传封面！");
          return;
        }
        if (this.video.content.length < 5) {
          this.$notify.toast("内容不能少于5个字！");
          return;
        }
        const user = this.$store.state.authUser;
        try {
          const response = await client.mutate({
            mutation: gql`
              mutation createvideo(
                $id: ID!
                $title: String
                $content: String
                ${isOld ? "" : "$image: String"}
                $tagsId: [TagWhereUniqueInput]
              ) {
                updateVideo(
                  id: $id
                  data: {
                    title: $title
                    content: $content
                    ${isOld ? "" : "cover: $image"}
                    tags: { connect: $tagsId }
                  }
                ) {
                  id
                  title
                  tags {
                    id
                    title
                  }
                  content
                  cover
                }
              }
            `,
            variables: {
              id: this.video.id,
              title: this.video.title,
              content: this.video.content,
              image: isOld ? null : image,
              tagsId: this.video.tags.map((tag) => ({ id: tag.id })),
            },
          });
          this.$router.push("/videos/" + response.data.updateVideo.id);
        } catch (error) {
          this.$notify.toast(error.message);
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
      title: '编辑视频信息 - BeeCMS'
    }
  }
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