<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-tabs center-active dark optional>
          <v-tab
            v-for="(setting,i) in settings"
            :key="i"
            nuxt
            :to="`/beecms/setting/${setting.url}`"
          >{{setting.title}}</v-tab>
        </v-tabs>
      </v-card>
    </v-col>
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <v-data-table
            :sort-by="['order']"
            :sort-desc="[true]"
            :headers="headers"
            :items="servers"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>云转码服务器</v-toolbar-title>
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
                            <v-text-field v-model="editedItem.domain" label="域名/ip" placeholder="带http/https"></v-text-field>
                          </v-col>
                          <v-col cols="12">
                            <v-text-field v-model="editedItem.apiKey" label="apiKey"></v-text-field>
                          </v-col>
                          <v-col cols="12">
                            <v-text-field v-model="editedItem.apiSecret" label="apiSecret"></v-text-field>
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
              </v-toolbar>
            </template>
            <template v-slot:item.actions="{ item }">
              <v-icon small class="mr-2" @click="ping(item)">{{mdiSendCheck}}</v-icon>
              <v-icon small class="mr-2" @click="editItem(item)">{{mdiPencil}}</v-icon>
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
import { mdiPencil, mdiDelete, mdiSendCheck } from "@mdi/js";
import axios from "axios";
export default {
  data() {
    return {
      settings: [
        {
          title: "云转码设置",
          url: "cloudserver",
        },
      ],
      servers: [],
      mdiPencil, mdiDelete,mdiSendCheck,
      dialog: false,
      dialogDelete: false,
      headers: [
        {
          text: "域名/IP",
          align: "start",
          sortable: false,
          value: "domain",
        },
        { text: "apiKey", value: "apiKey", sortable: false, },
        { text: "apiSecret", value: "apiSecret", sortable: false, },
        { text: "操作", value: "actions", sortable: false },
      ],
      editedIndex: -1,
      editedItem: {
        domain: "",
        apiKey: "",
        apiSecret: "",
      },
      defaultItem: {
        domain: "",
        apiKey: "",
        apiSecret: "",
      },
    };
  },
  mounted() {
    this.getCloudServer();
  },
  watch: {
    dialog(val) {
      val || this.close();
    },
    dialogDelete(val) {
      val || this.closeDelete();
    },
  },
  computed: {
    formTitle() {
      return this.editedIndex === -1 ? "添加" : "编辑";
    },
  },
  methods: {
    async ping(item) {
      try {
        const response = await axios({
          url: `${item.domain}/apifluent/ping`,
          method: 'post',
          data: { apikey: item.apiKey, apisecret: item.apiSecret },
          dataType: 'json',
        });
        if(response.status == 200 && response.data.success == 1) {
          this.$notify.toast("云转码服务器测试连接成功！");
        } else {
          this.$notify.toast("云转码服务器连接失败，请检查配置项！");
        }
      } catch (error) {
        this.$notify.toast("云转码服务器连接失败！")
      }
    },
    async getCloudServer() {
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getCloudServers {
            allCloudServers {
              id
              domain
              apiKey
              apiSecret
            }
          }
        `
      });
      this.servers = response.data.allCloudServers;
    },
    editItem(item) {
      this.editedIndex = this.servers.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialog = true;
    },

    deleteItem(item) {
      this.editedIndex = this.servers.indexOf(item);
      this.editedItem = Object.assign({}, item);
      this.dialogDelete = true;
    },
    close() {
      this.dialog = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },

    closeDelete() {
      this.dialogDelete = false;
      this.$nextTick(() => {
        this.editedItem = Object.assign({}, this.defaultItem);
        this.editedIndex = -1;
      });
    },
    async deleteItemConfirm() {
      const client = this.$apollo.getClient();
      if(this.editedIndex>-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation deleteCloudServer($id: ID!) {
              deleteCloudServer(id: $id) {
                id
              }
            }
          `,
          variables: {id: this.servers[this.editedIndex].id}
        });
        const cloudServer = response.data.deleteCloudServer;
        this.servers.splice(this.editedIndex, 1);
        this.$notify.toast("恭喜您，删除云转码服务器成功！");
        this.closeDelete()
      }
    },
    async save() {
      const client = this.$apollo.getClient();
      if(this.editedItem.domain.length==0 || this.editedItem.apiKey.length==0 || this.editedItem.apiSecret.length == 0) {
        this.$notify.toast('对不起，所有表单都是必填项!');
        return;
      }
      if(this.editedIndex==-1) {
        const response = await client.mutate({
          mutation: gql`
            mutation newCloudServer($domain: String, $apiKey: String, $apiSecret: String) {
              createCloudServer(data:{
                domain: $domain
                apiKey: $apiKey
                apiSecret: $apiSecret
              }) {
                id
                domain
                apiKey
                apiSecret
              }
            }
          `,
          variables: {domain: this.editedItem.domain, apiKey: this.editedItem.apiKey, apiSecret: this.editedItem.apiSecret}
        });
        const cloudServer = response.data.createCloudServer;
        this.servers.push(cloudServer);
        this.$notify.toast("恭喜您，添加云转码服务器成功！");
        this.close();
      } else {
        const updateResponse = await client.mutate({
          mutation: gql`
            mutation updateCloudServer($id: ID!, $domain: String, $apiKey: String, $apiSecret: String) {
              updateCloudServer(id: $id, data: {
                domain: $domain
                apiKey: $apiKey
                apiSecret: $apiSecret
              }) {
                id
                domain
                apiKey
                apiSecret
              }
            }
          `,
          variables: {id: this.servers[this.editedIndex].id, 
            domain: this.editedItem.domain,
            apiKey: this.editedItem.apiKey,
            apiSecret: this.editedItem.apiSecret }
        });
        const cloudServer = updateResponse.data.updateCloudServer;
        Object.assign(this.servers[this.editedIndex], cloudServer);
        this.$notify.toast("恭喜您，修改云转码服务器成功！");
        this.close();
      }
    },
  },
  head() {
    return {
      title: "云转码设置 - BeeCms",
    };
  },
};
</script>