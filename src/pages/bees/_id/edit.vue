<template>
  <v-row class="mx-auto">
    <v-col cols="12" md="12" class="mx-auto">
      <v-form ref="form" v-model="valid" lazy-validation>
        <div class="uploader mb-10">
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
        <v-text-field
          class="mb-3"
          solo
          type="text"
          v-model="bee.title"
          :rules="[rules.required]"
          label="标题"
          hint="输入标题"
        ></v-text-field>
        <editor
          class="mb-10"
          style="background: #1E1E1E"
          v-model="bee.content"
        ></editor>
        <v-switch
          class="mb-3"
          v-model="paidOpen"
          label="开启付费内容"
        ></v-switch>
        <editor
          v-if="paidOpen"
          style="background: #1E1E1E"
          class="mb-10"
          v-model="bee.paidContent"
        ></editor>
        <v-text-field
          v-if="paidOpen"
          class="mb-3"
          solo
          type="number"
          min="0"
          max="300"
          v-model="bee.price"
          :rules="[
            rules.required,
            (value) => (value > 0 && value <= 300) || '定价只能1到300之间！',
          ]"
          label="付费内容定价"
          hint="付费内容定价，范围1到300"
        ></v-text-field>
        <v-autocomplete
          v-model="bee.tags"
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
          <v-btn class="primary" @click="addbee" :disabled="!valid">提交</v-btn>
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
import editor from "~/components/editor";
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
      files: [],
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

              // Let FilePond know the request has comicn cancelled
              abort();
            },
          };
        },
      },
    };
  },
  components: {
    editor,
    FilePond,
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
          Bee(where: { id: $id }) {
            id
            title
            content
            price
            paidContent
            tags {
              id
              title
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
      variables: { type: "bee", id: id },
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const bee = response.data.Bee;
    if (pushTags.length) {
      tags = pushTags[0].tags;
      tags.push(...bee.tags);
    }
    let paidOpen = false;
    if(bee.price && bee.paidContent && bee.paidContent.length>5) {
      paidOpen = true;
    } else {
      paidOpen = false;
    }
    return {
      paidOpen,
      id,
      tags,
      bee,
      oldFiles: [
        {
          // the server file reference
          source: bee.cover.file.publicUrl,
          serverId: bee.cover.id,
          // set type to local to indicate an already uploaded file
          options: {
            type: "local",

            // pass poster property
            metadata: {
              poster: bee.cover.file.publicUrl,
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
      // this.bee.title = this.files[0].filenameWithoutExtension;
    },
    processFile: function () {
      this.finishUplaod = true;
    },
    handleFilePondInit: function () {
      console.log("FilePond has initialized");
      // FilePond instance methods are available on `this.$refs.pond`
    },
    async addbee() {
      const file = this.$refs.pond.getFile();
      let imageId = null;
      if (file) {
        imageId = file.serverId;
      }
      const client = this.$apollo.getClient();
      const isOld = file.source == this.bee.cover.file.publicUrl;
      if (
        file.source != this.bee.cover.file.publicUrl &&
        !this.finishUplaod
      ) {
        this.$notify.toast("请等待封面上传完成！");
      }
      if (this.$refs.form.validate()) {
        if (this.bee.content.length < 5) {
          this.$notify.toast("内容不能少于5个字！");
          return;
        }
        if (!imageId) {
          this.$notify.toast("请上传封面！");
          return;
        }
        const user = this.$store.state.authUser;
        try {
          const response = await client.mutate({
            mutation: gql`
              mutation createBee(
                $id: ID!
                $title: String
                $content: String
                ${
                  this.paidOpen && this.bee.paidContent.length && this.bee.price
                    ? "$paidContent: String"
                    : ""
                }
                ${
                  this.paidOpen && this.bee.paidContent.length && this.bee.price
                    ? "$price: Int"
                    : ""
                }
                ${isOld ? "" : "$imageId: ID!"}
                $tagsId: [TagWhereUniqueInput]
              ) {
                updateBee(
                  id: $id
                  data: {
                    title: $title
                    content: $content
                    paidContent: ${
                      this.paidOpen &&
                      this.bee.paidContent.length &&
                      this.bee.price
                        ? "$paidContent"
                        : null
                    }
                    price: ${
                      this.paidOpen &&
                      this.bee.paidContent.length &&
                      this.bee.price
                        ? "$price"
                        : 0
                    }
                    ${isOld ? "" : "cover: { connect: { id: $imageId } }"}
                    tags: { connect: $tagsId }
                  }
                ) {
                  id
                  title
                  content
                  price
                  paidContent
                  tags {
                    id
                    title
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
              id: this.id,
              title: this.bee.title,
              content: this.bee.content,
              paidContent:
                this.paidOpen && this.bee.paidContent.length && this.bee.price
                  ? this.bee.paidContent
                  : null,
              price:
                this.paidOpen && this.bee.paidContent.length && this.bee.price
                  ? this.bee.price * 1
                  : 0,
              imageId: imageId,
              tagsId: this.bee.tags.map((tag) => ({ id: tag.id })),
            },
          });
          this.$router.push("/bees/" + response.data.updateBee.id);
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
        title: this.bee.title + ' - 编辑文章 - 蜂窝创作平台'
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