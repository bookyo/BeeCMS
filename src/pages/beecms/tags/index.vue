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
            :items="tags"
            :options.sync="options"
            :server-items-length="totalTags"
            :loading="loading"
            :items-per-page="5"
            :footer-props="{
              itemsPerPageOptions: [ 5, 10, 15, 100 ]
            }"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>标签</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialog" max-width="500px">
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn color="primary" dark v-bind="attrs" v-on="on">添加</v-btn>
                  </template>
                  <v-card>
                    <v-card-title>
                      <span class="headline">{{ formTitle }}</span>
                    </v-card-title>
                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12">
                            <v-text-field v-model="editedItem.title" label="标签名" placeholder="输入标签名"></v-text-field>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="close">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="save">保存</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialogDelete" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closeDelete">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-dialog v-model="dialogPush" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">推送标签至板块</v-card-title>
                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12">
                            <v-select 
                              v-model="category"
                              :items="categories"
                              item-text="text"
                              item-value="value"
                              label="选择板块"
                            >
                            </v-select>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closePush">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="addPush">提交</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon class="mr-2" small @click="pushTag(item)">{{mdiStarPlus}}</v-icon>
              <v-icon class="mr-2" small @click="editItem(item)">{{mdiPencil}}</v-icon>
              <v-icon small @click="deleteItem(item)">{{mdiDelete}}</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers1"
            :items="videoPushTags"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>视频推荐标签</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialogDelete1" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closeDelete1">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm1">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon small @click="deleteItem1(item)">{{mdiDelete}}</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers1"
            :items="novelPushTags"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>小说推荐标签</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialogDelete2" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closeDelete2">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm2">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon small @click="deleteItem2(item)">{{mdiDelete}}</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers1"
            :items="comicPushTags"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>漫画推荐标签</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialogDelete3" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closeDelete3">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm3">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon small @click="deleteItem3(item)">{{mdiDelete}}</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers1"
            :items="beePushTags"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>蜂窝号推荐标签</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialogDelete4" max-width="500px">
                  <v-card>
                    <v-card-title class="headline">您确定要删除?</v-card-title>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="closeDelete4">取消</v-btn>
                      <v-btn color="blue darken-1" text @click="deleteItemConfirm4">确定</v-btn>
                      <v-spacer></v-spacer>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon small @click="deleteItem4(item)">{{mdiDelete}}</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import { mdiPencil, mdiDelete, mdiStarPlus } from "@mdi/js";
export default {
  data() {
    return {
      tags: [],
      mdiPencil, mdiDelete, mdiStarPlus,
      dialog: false,
      dialogDelete: false,
      dialogPush: false,
      categories: [
        {text: '视频', value:'video'},
        {text: '小说', value:'novel'},
        {text: '漫画', value:'comic'},
        {text: '蜂窝号', value:'bee'},
      ],
      category: null,
      items: [
        {
          text: "控制台",
          disabled: false,
          exact: true,
          to: "/beecms",
        },
        {
          text: '标签',
          disabled: true,
          to: "/beecms/tags"
        }
      ],
      headers: [
        {
          text: "标签名",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "内容数", value: "counts", sortable: false, },
        { text: "操作", value: "actions", sortable: false },
      ],
      editedIndex: -1,
      editedItem: {
        title: ""
      },
      defaultItem: {
        title: ""
      },
      totalTags: 0,
      loading: false,
      options: {},
      pushTags: [],
      headers1: [
        {
          text: "标签名",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "操作", value: "actions", sortable: false },
      ],
      dialogDelete1: false,
      dialogDelete2: false,
      dialogDelete3: false,
      dialogDelete4: false,
    };
  },
  mounted() {
    this.getTags();
    this.getPushTags();
  },
  watch: {
    options: {
      handler () {
        this.getTags()
      },
      deep: true,
    },
    dialog(val) {
      val || this.close();
    },
    dialogDelete(val) {
      val || this.closeDelete();
    },
    dialogPush(val) {
      val || this.closePush();
    },
    dialogDelete1(val) {
      val || this.closeDelete1();
    },
    dialogDelete2(val) {
      val || this.closeDelete2();
    },
    dialogDelete3(val) {
      val || this.closeDelete3();
    },
    dialogDelete4(val) {
      val || this.closeDelete4();
    },
  },
  computed: {
    formTitle() {
      return this.editedIndex === -1 ? "添加" : "编辑";
    },
    videoPushTags() {
      const pushTags = this.pushTags.filter(item => item.type=='video');
      return pushTags[0]?pushTags[0].tags:[];
    },
    novelPushTags() {
      const pushTags = this.pushTags.filter(item => item.type=='novel');
      return pushTags[0]?pushTags[0].tags:[];
    },
    comicPushTags() {
      const pushTags = this.pushTags.filter(item => item.type=='comic');
      return pushTags[0]?pushTags[0].tags:[];
    },
    beePushTags() {
      const pushTags = this.pushTags.filter(item => item.type=='bee');
      return pushTags[0]?pushTags[0].tags:[];
    },
  },
  methods: {
    filterPushTags(value) {
      return this.pushTags.filter(item => item.type==value);
    },
    async addPush() {
      if(!this.category) {
        this.$notify.toast("必须选择一个类别！");
        return;
      }
      const category = this.category;
      const pushTags = this.filterPushTags(category);
      const id = this.tags[this.editedIndex].id;
      const client = this.$apollo.getClient();
      if(pushTags.length) {
        const tags = pushTags[0].tags;
        if(tags.find((tag) => tag.id == id)){
          this.$notify.toast("此标签已经推荐过了！");
          return;
        }
        const response = await client.mutate({
          mutation: gql`
            mutation updatePushTag($id: ID!, $tagId: ID!) {
              updatePushTag(id: $id, data: {tags: {connect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: { id: pushTags[0].id, tagId: id}
        });
        const data = response.data.updatePushTag;
        const index = this.pushTags.findIndex((tag) => tag.id == pushTags[0].id);
        this.pushTags[index].tags = data.tags;
        this.$notify.toast(`推荐标签至${category}成功！`);
      } else {
        const response = await client.mutate({
          mutation: gql`
            mutation addPushTag($type: String, $tagId: ID!) {
              createPushTag(data: {type: $type,  tags: {connect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: {type: category, tagId: id}
        });
        const pushTag = response.data.createPushTag;
        this.pushTags.push(pushTag);
        this.$notify.toast(`推荐标签至${category}成功！`);
      }
    },
    async getPushTags() {
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getPushTags {
            allPushTags {
              id
              tags {
                id
                title
              }
              type
            }
          }
        `
      });
      this.pushTags = response.data.allPushTags;
    },
    async getTags() {
      const { sortBy, sortDesc, page, itemsPerPage } = this.options;
      // console.log(this.options);
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getTags($first: Int, $skip: Int) {
            allTags(first: $first, skip: $skip, sortBy: createdAt_DESC) {
              id
              title
              counts
            }
            _allTagsMeta {
              count
            }
          }
        `,
        variables: { first: itemsPerPage, skip: (page-1)*itemsPerPage },
        fetchPolicy: 'no-cache',
      });
      this.tags = response.data.allTags;
      this.totalTags = response.data._allTagsMeta.count;
      this.loading = false;
    },
    editItem(item) {
      this.editedIndex = this.tags.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },

    deleteItem(item) {
      this.editedIndex = this.tags.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialogDelete = true;
    },
    pushTag(item) {
      this.editedIndex = this.tags.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialogPush = true;
    },

    close() {
      this.dialog = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },
    closePush() {
      this.dialogPush = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      })
    },
    closeDelete() {
      this.dialogDelete = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },
    deleteItem1(item) {
      this.editedIndex = this.videoPushTags.indexOf(item);
      this.dialogDelete1 = true;
    },
    closeDelete1() {
      this.dialogDelete1 = false;
      this.$nextTick(() => {
        this.editedIndex = -1;
      });
    },
    async deleteItemConfirm1() {
      const client = this.$apollo.getClient();
      const pushTags = this.filterPushTags('video');
      const videoPushTag = pushTags[0];
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation updatePushTag($id: ID!, $tagId: ID!) {
              updatePushTag(id: $id, data: {tags: {disconnect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: {id: videoPushTag.id, tagId: this.videoPushTags[this.editedIndex].id}
        });
        const data = response.data.updatePushTag;
        this.videoPushTags.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除成功！");
        this.closeDelete1()
      }
    },
    deleteItem2(item) {
      this.editedIndex = this.novelPushTags.indexOf(item);
      this.dialogDelete2 = true;
    },
    closeDelete2() {
      this.dialogDelete2 = false;
      this.$nextTick(() => {
        this.editedIndex = -1;
      });
    },
    async deleteItemConfirm2() {
      const client = this.$apollo.getClient();
      const pushTags = this.filterPushTags('novel');
      const novelPushTag = pushTags[0];
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation updatePushTag($id: ID!, $tagId: ID!) {
              updatePushTag(id: $id, data: {tags: {disconnect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: {id: novelPushTag.id, tagId: this.novelPushTags[this.editedIndex].id}
        });
        const data = response.data.updatePushTag;
        this.novelPushTags.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除成功！");
        this.closeDelete2()
      }
    },
    deleteItem3(item) {
      this.editedIndex = this.comicPushTags.indexOf(item);
      this.dialogDelete3 = true;
    },
    closeDelete3() {
      this.dialogDelete3 = false;
      this.$nextTick(() => {
        this.editedIndex = -1;
      });
    },
    async deleteItemConfirm3() {
      const client = this.$apollo.getClient();
      const pushTags = this.filterPushTags('comic');
      const comicPushTag = pushTags[0];
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation updatePushTag($id: ID!, $tagId: ID!) {
              updatePushTag(id: $id, data: {tags: {disconnect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: {id: comicPushTag.id, tagId: this.comicPushTags[this.editedIndex].id}
        });
        const data = response.data.updatePushTag;
        this.comicPushTags.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除成功！");
        this.closeDelete3()
      }
    },
    deleteItem4(item) {
      this.editedIndex = this.beePushTags.indexOf(item);
      this.dialogDelete4 = true;
    },
    closeDelete4() {
      this.dialogDelete4 = false;
      this.$nextTick(() => {
        this.editedIndex = -1;
      });
    },
    async deleteItemConfirm4() {
      const client = this.$apollo.getClient();
      const pushTags = this.filterPushTags('bee');
      const beePushTag = pushTags[0];
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation updatePushTag($id: ID!, $tagId: ID!) {
              updatePushTag(id: $id, data: {tags: {disconnect: {id: $tagId}}}) {
                id
                tags {
                  id
                  title
                }
                type
              }
            }
          `,
          variables: {id: beePushTag.id, tagId: this.beePushTags[this.editedIndex].id}
        });
        const data = response.data.updatePushTag;
        this.beePushTags.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除成功！");
        this.closeDelete4()
      }
    },
    async deleteItemConfirm() {
      const client = this.$apollo.getClient();
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation deleteTag($id: ID!) {
              deleteTag(id: $id) {
                id
              }
            }
          `,
          variables: {id: this.tags[this.editedIndex].id}
        });
        const tag = response.data.deleteTag;
        this.tags.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除标签成功！");
        this.closeDelete()
      }
    },
    async save() {
      const client = this.$apollo.getClient();
      if(this.editedItem.title.length==0) {
        this.$notify.toast('对不起，标签名不能为空!');
        return;
      }
      if(this.editedIndex==-1) {
        try {
          const response = await client.mutate({
            mutation: gql`
              mutation newTag($title: String) {
                createTag(data:{
                  title: $title
                }) {
                  id
                  title
                  counts
                }
              }
            `,
            variables: {title: this.editedItem.title}
          });
          const tag = response.data.createTag;
          this.getTags();
          this.$notify.toast("恭喜您，添加标签成功！");
          this.close();
        } catch (error) {
          this.$notify.toast(error.message);
        }
      } else {
        const updateResponse = await client.mutate({
          mutation: gql`
            mutation updateTag($id: ID!, $title: String) {
              updateTag(id: $id, data: {
                title: $title
              }) {
                id
                title
                counts
              }
            }
          `,
          variables: {id: this.tags[this.editedIndex].id, 
            title: this.editedItem.title}
        });
        const tag = updateResponse.data.updateTag;
        Object.assign(this.tags[this.editedIndex], tag);
        this.$notify.toast("恭喜您，修改标签成功！");
        this.close();
      }
    },
  },
  head() {
    return {
      title: "标签设置 - BeeCms",
    };
  },
};
</script>