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
            :items="bees"
            :options.sync="options"
            :server-items-length="totalBees"
            :loading="loading"
            :items-per-page="5"
            :footer-props="{
              itemsPerPageOptions: [ 5, 10, 15, 100 ]
            }"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>蜂窝号自媒体管理</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-dialog v-model="dialog" max-width="500px">
                  <v-card>
                    <v-card-title>
                      <span class="headline">编辑</span>
                    </v-card-title>
                    <v-card-subtitle>
                      <span>详细编辑请前往自蜂窝号详细页面进行编辑</span>
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
                            <v-text-field
                              v-model="editedItem.paidContent"
                              label="标题"
                              :rules="[rules.required]"
                              placeholder="付费内容"
                            ></v-text-field>
                          </v-col>
                          <v-col cols="12">
                            <v-text-field
                              v-model="editedItem.price"
                              label="价格"
                              :rules="[rules.required]"
                              placeholder="付费内容价格"
                            ></v-text-field>
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
              </v-toolbar>
            </template>
            <template v-slot:item.title="{ item }">
              <span>
                <nuxt-link :to="`/bees/${item.id}`">{{item.title}}</nuxt-link>
              </span>
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
      bees: [],
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
          text: "蜂窝号自媒体管理",
          disabled: true,
          to: "/beecms/bees",
        },
      ],
      headers: [
        {
          text: "标题",
          align: "start",
          sortable: false,
          value: "title",
        },
        { text: "付费内容", value: "paidContent", sortable: false },
        { text: "付费内容价格", value: "price", sortable: false },
        { text: "发布日期", value: "createdAt", sortable: false },
        { text: "发布用户", value: "owner", sortable: false },
        { text: "状态", value: "status", sortable: false },
        { text: "操作", value: "actions", sortable: false },
      ],
      editedItem: {
        id: "",
        title: "",
        paidContent: "",
        price: 0,
      },
      totalBees: 0,
      loading: false,
      options: {},
      rules: {
        required: (value) => !!value || "必填.",
      },
    };
  },
  mounted() {
    this.getBees();
  },
  watch: {
    options: {
      handler() {
        this.getBees();
      },
      deep: true,
    },
  },
  methods: {
    async getBees() {
      const { sortBy, sortDesc, page, itemsPerPage } = this.options;
      // console.log(this.options);
      this.loading = true;
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getBees($first: Int, $skip: Int) {
            allBees(first: $first, skip: $skip, sortBy: createdAt_DESC) {
              id
              title
              paidContent
              price
              status
              createdAt
              owner {
                id
                name
              }
            }
            _allBeesMeta {
              count
            }
          }
        `,
        variables: { first: itemsPerPage, skip: (page - 1) * itemsPerPage },
        fetchPolicy: "no-cache",
      });
      this.bees = response.data.allBees;
      this.totalBees = response.data._allBeesMeta.count;
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
        mutation: gql`mutation delete($id: ID!) {
            deleteBee(id: $id) {
              id
              __typename
            }
        }`,
        variables: {id: this.editedItem.id}
      });
      notify.toast('恭喜您删除蜂窝号文章成功!');
      const index = _.findIndex(this.bees, { 'id': this.editedItem.id });
      this.bees.splice(index, 1);
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
                  mutation passBee($id: ID!) {
                    updateBee(id: $id, data: { status: "published" }) {
                      id
                    }
                  }
                `,
                variables: { id: item.id },
              });
              const index = _.findIndex(root.bees, { 'id': item.id });
              Object.assign(root.bees[index], {status: 'published'});
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