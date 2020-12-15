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
            :items="novels"
            :options.sync="options"
            :server-items-length="totalNovels"
            :loading="loading"
            :items-per-page="5"
            :footer-props="{
              itemsPerPageOptions: [ 5, 10, 15, 100 ]
            }"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>小说管理</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialog" max-width="500px">
                  <v-card>
                    <v-card-title>
                      <span class="headline">编辑</span>
                    </v-card-title>
                    <v-card-subtitle>
                      <span>详细编辑请前往小说详细页面进行编辑</span>
                    </v-card-subtitle>
                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12">
                            <v-text-field
                              v-model="editedItem.title"
                              label="标题"
                              :rules="[rules.required]"
                              placeholder="输入标题"
                            ></v-text-field>
                          </v-col>
                          <v-col cols="12">
                            <v-textarea
                              v-model="editedItem.content"
                              label="描述"
                              :rules="[rules.required]"
                              placeholder="输入描述"
                            ></v-textarea>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="dialog = false">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="save">保存</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialogDelete" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="dialogDelete = false">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialogView" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">{{editedItem.title}}详细章节</v-card-title>
                    <v-card-text>
                      <template v-for="chapter in chapters">
                        <v-chip
                          :key="chapter.id"
                          class="ma-1"
                          link
                          :to="`/novels/${editedItem.id}/chapters/${chapter.id}`"
                        >{{chapter.title}}<span v-if="chapter.status == 'review'">(未审核)</span></v-chip>
                      </template>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="dialogView = false">关闭</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.owner="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="30" color="primary">
                  <span class="white--text">{{item.owner.name.substr(0, 1)}}</span>
                </v-avatar>
                <div class="ml-2">
                  <nuxt-link :to="`/users/${item.owner.id}`">{{item.owner.name}}</nuxt-link>
                </div>
              </div>
            </template>
            <template v-slot:item.createdAt="{ item }">
              <span>{{$moment(item.createdAt).fromNow()}}</span>
            </template>
            <template v-slot:item.chapters="{ item }">
              <v-btn text @click="viewChapter(item)">共有{{item.chapters.length}}章</v-btn>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-tooltip bottom v-if="item.status=='review'">
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    class="mr-2"
                    v-bind="attrs"
                    v-on="on"
                    small
                    @click="reviewItem(item)"
                  >{{mdiTextBoxCheck}}</v-icon>
                </template>
                <span>审核</span>
              </v-tooltip>
              <v-icon class="mr-2" small @click="editItem(item)">{{mdiPencil}}</v-icon>
              <v-icon small @click="deleteItem(item)">{{mdiDelete}}</v-icon>
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
import _ from 'lodash';
export default {
  data() {
    return {
      novels: [],
      mdiPencil,
      mdiDelete,
      mdiTextBoxCheck,
      dialog: false,
      dialogDelete: false,
      dialogView: false,
      items: [
        {
          text: "控制台",
          disabled: false,
          exact: true,
          to: "/beecms",
        },
        {
          text: "小说管理",
          disabled: true,
          to: "/beecms/novels",
        },
      ],
      headers: [
        {
          text: "标题",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "描述", value: "content", sortable: false },
        { text: "章节", value: "chapters", sortable: false },
        { text: "发布日期", value: "createdAt", sortable: false },
        { text: "发布用户", value: "owner", sortable: false },
        { text: "状态", value: "status", sortable: false },
        { text: "操作", value: "actions", sortable: false },
      ],
      editedItem: {
        id: "",
        title: "",
        content: "",
      },
      chapters: [],
      totalNovels: 0,
      loading: false,
      options: {},
      rules: {
        required: (value) => !!value || "必填.",
      },
    };
  },
  mounted() {
    this.getNovels();
  },
  watch: {
    options: {
      handler() {
        this.getNovels();
      },
      deep: true,
    },
  },
  methods: {
    async getNovels() {
      const { sortBy, sortDesc, page, itemsPerPage } = this.options;
      // console.log(this.options);
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getNovels($first: Int, $skip: Int) {
            allNovels(first: $first, skip: $skip, sortBy: createdAt_DESC) {
              id
              title
              content
              status
              createdAt
              chapters {
                id
                title
                status
              }
              owner {
                id
                name
              }
            }
            _allNovelsMeta {
              count
            }
          }
        `,
        variables: { first: itemsPerPage, skip: (page - 1) * itemsPerPage },
        fetchPolicy: "no-cache",
      });
      this.novels = response.data.allNovels;
      this.totalNovels = response.data._allNovelsMeta.count;
      this.loading = false;
    },
    editItem(item) {
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },
    viewChapter(item) {
      this.editedItem = Object.assign({}, item);
      this.chapters = item.chapters;
      this.dialogView = true;
    },
    deleteItem(item) {
      this.editedItem = Object.assign({}, item);
      this.dialogDelete = true;
    },
    async deleteItemConfirm() {
      const client = this.$apollo.getClient();
      const notify = this.$notify;
      const response = await client.mutate({
        mutation: gql`mutation delete($id: ID!) {
            deleteNovel(id: $id) {
              id
              __typename
            }
        }`,
        variables: {id: this.editedItem.id}
      });
      notify.toast('恭喜您删除小说成功!');
      const index = _.findIndex(this.novels, { 'id': this.editedItem.id });
      this.novels.splice(index, 1);
      this.dialogDelete = false;
    },
    save() {},
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
            try {
              await client.mutate({
                mutation: gql`
                  mutation passNovel($id: ID!) {
                    updateNovel(id: $id, data: { status: "published" }) {
                      id
                    }
                  }
                `,
                variables: { id: item.id },
              });
              const index = _.findIndex(root.novels, { 'id': item.id });
              Object.assign(root.novels[index], {status: 'published'});
              notify.toast("恭喜您，审核通过！");
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