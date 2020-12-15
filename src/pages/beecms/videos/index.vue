<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-breadcrumbs :items="items"></v-breadcrumbs>
      </v-card>
    </v-col>
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <v-data-table
            :sort-desc="[true]"
            :headers="headers"
            :items="videos"
            :options.sync="options"
            :server-items-length="totalVideos"
            :loading="loading"
            :items-per-page="5"
            :expanded.sync="expanded"
            :footer-props="{
              itemsPerPageOptions: [5, 10, 15, 100],
            }"
            show-expand
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>视频管理</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialog" max-width="500px">
                  <v-card>
                    <v-card-title>
                      <span class="headline">编辑</span>
                    </v-card-title>
                    <v-card-subtitle>
                      <span>详细编辑请前往视频详细页面进行编辑</span>
                    </v-card-subtitle>
                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12">
                            <v-text-field
                              v-model="editedItem.title"
                              label="视频名"
                              :rules="[rules.required]"
                              placeholder="输入视频名"
                            ></v-text-field>
                          </v-col>
                          <v-col cols="12">
                            <v-text-field
                              v-model="editedItem.content"
                              label="描述"
                              :rules="[rules.required]"
                              placeholder="输入视频描述"
                            ></v-text-field>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="dialog = false"
                        >取消</v-btn
                      >
                      <v-btn color="blue darken-1" text @click="save"
                        >保存</v-btn
                      >
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialogDelete" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn
                        color="blue darken-1"
                        text
                        @click="dialogDelete = false"
                        >取消</v-btn
                      >
                      <v-btn
                        color="blue darken-1"
                        text
                        @click="deleteItemConfirm"
                        >确定</v-btn
                      >
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.title="{ item }">
              <span
                ><nuxt-link :to="`/videos/${item.id}`">{{
                  item.title
                }}</nuxt-link></span
              >
            </template>
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
            <template v-slot:item.createdAt="{ item }">
              <span>{{ $moment(item.createdAt).fromNow() }}</span>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-tooltip bottom v-if="item.status == 'review'">
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    class="mr-2"
                    v-bind="attrs"
                    v-on="on"
                    small
                    @click="reviewItem(item)"
                    >{{ mdiTextBoxCheck }}</v-icon
                  >
                </template>
                <span>审核</span>
              </v-tooltip>
              <v-icon class="mr-2" small @click="editItem(item)">{{
                mdiPencil
              }}</v-icon>
              <v-icon small @click="deleteItem(item)">{{ mdiDelete }}</v-icon>
            </template>
            <template v-slot:expanded-item="{ headers, item }">
              <td :colspan="headers.length">
                <v-list two-line dense>
                  <v-list-item v-for="episode in item.episodes" :key="episode.id">
                    <v-list-item-content>
                      <v-list-item-title>分集:{{episode.title}},状态:{{episode.status}},价格:{{episode.price}}</v-list-item-title>
                      <v-list-item-subtitle>视频地址：
                        <a :href="`${setting.publicUrl}/${item.owner.id}/${episode.path}`" target="_blank">源地址</a>
                      </v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-action>
                      <v-btn v-if="episode.status == 'review'" @click="reviewEpisode(item, episode)">审核</v-btn>
                    </v-list-item-action>
                  </v-list-item>
                </v-list>
              </td>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import gql from "graphql-tag";
import { mdiPencil, mdiDelete, mdiTextBoxCheck } from "@mdi/js";
import _ from "lodash";
export default {
  data() {
    return {
      videos: [],
      setting: null,
      expanded: [],
      mdiPencil,
      mdiDelete,
      mdiTextBoxCheck,
      dialog: false,
      dialogDelete: false,
      items: [
        {
          text: "控制台",
          disabled: false,
          exact: true,
          to: "/beecms",
        },
        {
          text: "视频管理",
          disabled: true,
          to: "/beecms/videos",
        },
      ],
      headers: [
        {
          text: "视频名",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "描述", value: "content", sortable: false },
        { text: "发布日期", value: "createdAt", sortable: false },
        { text: "发布用户", value: "owner", sortable: false },
        { text: "状态", value: "status", sortable: false },
        { text: "操作", value: "actions", sortable: false },
      ],
      editedItem: {
        id: "",
        title: "",
        content: "",
        price: 0,
      },
      totalVideos: 0,
      loading: false,
      options: {},
      rules: {
        required: (value) => !!value || "必填.",
      },
    };
  },
  mounted() {
    this.getVideos();
  },
  watch: {
    options: {
      handler() {
        this.getVideos();
      },
      deep: true,
    },
  },
  methods: {
    async getVideos() {
      const { sortBy, sortDesc, page, itemsPerPage } = this.options;
      // console.log(this.options);
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getVideos($first: Int, $skip: Int) {
            allVideos(first: $first, skip: $skip, sortBy: createdAt_DESC) {
              id
              title
              content
              status
              createdAt
              episodes {
                id
                title
                path
                status
                price
              }
              owner {
                id
                name
              }
            }
            allSettings(first: 1) {
              id
              publicUrl
            }
            _allVideosMeta {
              count
            }
          }
        `,
        variables: { first: itemsPerPage, skip: (page - 1) * itemsPerPage },
        fetchPolicy: "no-cache",
      });
      this.videos = response.data.allVideos;
      this.setting = response.data.allSettings[0];
      this.totalVideos = response.data._allVideosMeta.count;
      this.loading = false;
    },
    editItem(item) {
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },

    deleteItem(item) {
      this.editedItem = Object.assign({}, item);
      this.dialogDelete = true;
    },
    async deleteItemConfirm() {
      const client = this.$apollo.getClient();
      const notify = this.$notify;
      const response = await client.mutate({
        mutation: gql`
          mutation delete($id: ID!) {
            deleteVideo(id: $id) {
              id
              __typename
            }
          }
        `,
        variables: { id: this.editedItem.id },
      });
      notify.toast("恭喜您删除视频成功!");
      const index = _.findIndex(this.videos, { id: this.editedItem.id });
      this.videos.splice(index, 1);
      this.dialogDelete = false;
    },
    save() {},
    reviewEpisode(item,episode) {
      const client = this.$apollo.getClient();
      const notify = this.$notify;
      const root = this;
      this.$notify
        .confirm(
          {
            title: "确定审核通过？",
          },
          {
            x: "center",
            y: "center",
            color: "default",
          }
        )
        .then(async function (result) {
          if(result) {
            try {
              await client.mutate({
                mutation: gql`
                  mutation passEpisode($id: ID!) {
                    updateEpisode(id: $id, data: { status: "passed" }) {
                      id
                    }
                  }
                `,
                variables: { id: episode.id },
              });
              notify.toast("恭喜您，审核通过！");
              const videoIndex = _.findIndex(root.videos, {id: item.id});
              const episodeIndex = _.findIndex(root.videos[videoIndex].episodes, {id: episode.id});
              Object.assign(root.videos[videoIndex].episodes[episodeIndex], { status: "passed" });
            } catch (error) {
              console.log(error);
            }
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    },
    reviewItem(item) {
      const client = this.$apollo.getClient();
      const notify = this.$notify;
      const root = this;
      this.$notify
        .confirm(
          {
            title: "确认审核通过？",
          },
          {
            x: "center",
            y: "center",
            color: "default",
          }
        )
        .then(async function (result) {
          if (result) {
            if(item.episodes[0].status!='published') {
              notify.toast("请确保本节目下至少一个视频审核通过并且状态为可播放！");
              return;
            }
            try {
              await client.mutate({
                mutation: gql`
                  mutation passVideo($id: ID!) {
                    updateVideo(id: $id, data: { status: "published" }) {
                      id
                    }
                  }
                `,
                variables: { id: item.id },
              });
              notify.toast("恭喜您，审核通过！");
              const index = _.findIndex(root.videos, { id: item.id });
              Object.assign(root.videos[index], { status: "published" });
            } catch (error) {
              console.log(error);
            }
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    },
  },
};
</script>