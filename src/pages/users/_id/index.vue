<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-breadcrumbs :items="items"></v-breadcrumbs>
      </v-card>
      <v-card class="mt-5">
        <v-img class="white--text" height="300" src="/cover.png">
          <v-container fill-height fluid>
            <v-layout fill-height justify-center align-center column>
              <v-avatar :color="user.avatar ? '' : 'teal'" size="100">
                <img v-if="user.avatar" :src="user.avatar.file.publicUrl" />
                <span class="white--text display-2">{{
                  user.name.substr(0, 1)
                }}</span>
              </v-avatar>
              <h1 class="title mt-3">{{ user.name }}</h1>
              <div class="d-flex mt-3">
                <div class="d-flex flex-column align-center">
                  <div>粉丝</div>
                  <div class="text--secondary">
                    {{
                      followTo.count > 1000
                        ? (followTo.count / 1000).toFixed(2) + "k"
                        : followTo.count
                    }}
                  </div>
                </div>
                <v-divider class="mx-5" vertical />
                <div class="d-flex flex-column align-center">
                  <div>关注</div>
                  <div class="text--secondary">
                    {{
                      followBy.count > 1000
                        ? (followBy.count / 1000).toFixed(2) + "k"
                        : followBy.count
                    }}
                  </div>
                </div>
                <v-divider class="mx-5" vertical />
                <div class="d-flex flex-column align-center">
                  <div>积分</div>
                  <div class="text--secondary">
                    {{
                      user.score > 1000
                        ? (user.score / 1000).toFixed(2) + "k"
                        : user.score
                    }}
                  </div>
                </div>
              </div>
              <div
                v-if="authUser && authUser.id == user.id"
                class="d-flex other-action mt-3"
              >
                <v-btn @click="dialog = true" color="primary">提现申请</v-btn>
              </div>
            </v-layout>
          </v-container>
        </v-img>
      </v-card>
    </v-col>
    <item-section
      :title="`${user.name}发布的视频`"
      type="videos"
      :items="videos"
    ></item-section>
    <item-section
      :title="`${user.name}发布的漫画`"
      type="comics"
      :items="comics"
    ></item-section>
    <item-section
      :title="`${user.name}发布的小说`"
      type="novels"
      :items="novels"
    ></item-section>
    <item-section
      :title="`${user.name}发布的蜂窝号`"
      type="bees"
      :items="bees"
    ></item-section>
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>申请提现</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                所有用户都可申请提现，积分对照20:1兑换RMB。
              </v-col>
              <v-col cols="12">
                <v-text-field
                  type="number"
                  v-model="exchange.score"
                  :rules="[
                    (value) => !!value || value === 0 || '不能为空！',
                    (value) =>
                      (value >= 100 && value <= this.user.score) ||
                      '积分必须为100以上且不能超过您的积分',
                  ]"
                  label="提现积分数"
                  hint="输入您想提现多少积分"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-select
                  :items="types"
                  item-text="title"
                  item-value="value"
                  no-data-text="没有数据"
                  v-model="exchange.type"
                  mandatory
                  return-object
                  label="选择提现方式"
                >
                </v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  type="text"
                  v-model="exchange.account"
                  :rules="[(value) => !!value || '不能为空！']"
                  label="账号/卡号"
                  hint="输入您的支付宝账号或银行卡号"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  type="text"
                  v-model="exchange.name"
                  :rules="[(value) => !!value || '不能为空！']"
                  label="姓名"
                  hint="输入您的姓名"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  type="text"
                  v-model="exchange.branch"
                  :rules="[(value) => !!value || '不能为空！']"
                  label="开户支行"
                  hint="如果是银行卡，请输入开户行，如：重庆市鼓楼区建设银行支行，支付宝可不填"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialog = false">关闭</v-btn>
          <v-btn class="primary" @click="submitExchange">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
import gql from "graphql-tag";
import itemSection from "~/components/itemSection";
export default {
  layout: "indexlayout",
  async asyncData({ app, error, store, redirect, params }) {
    const client = app.apolloProvider.defaultClient;
    const user = store.state.authUser;
    const id = params.id;
    try {
      const response = await client.query({
        query: gql`
          query getUser($id: ID!) {
            User(where: { id: $id }) {
              id
              name
              score
            }
            followBy: _allFollowsMeta(where: { followBy: { id: $id } }) {
              count
            }
            followTo: _allFollowsMeta(where: { followTo: { id: $id } }) {
              count
            }
            allVideos(first: 8, where: { owner: { id: $id } }) {
              id
              title
              cover
              owner {
                id
                name
              }
              createdAt
            }
            allComics(first: 8, where: { owner: { id: $id } }) {
              id
              title
              owner {
                id
                name
              }
              createdAt
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
            }
            allNovels(first: 8, where: { owner: { id: $id } }) {
              id
              title
              owner {
                id
                name
              }
              createdAt
              cover {
                id
                file {
                  id
                  publicUrl
                }
              }
            }
            allBees(first: 8, where: { owner: { id: $id } }) {
              id
              title
              owner {
                id
                name
              }
              createdAt
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
        variables: { id: id },
      });
      const videos = response.data.allVideos;
      const comics = response.data.allComics;
      const novels = response.data.allNovels;
      const bees = response.data.allBees;
      const followBy = response.data.followBy;
      const followTo = response.data.followTo;
      return {
        user: response.data.User,
        authUser: user,
        videos,
        comics,
        novels,
        bees,
        followBy,
        followTo,
        dialog: false,
        exchange: {
          score: 100,
          type: "aliPay",
          account: "",
          name: "",
          branch: "",
        },
        types: [
          {
            value: "aliPay",
            title: "支付宝",
          },
          {
            value: "bank",
            title: "银行卡",
          },
        ],
        items: [
          {
            text: "蜂窝创作平台",
            disabled: false,
            exact: true,
            to: `/`,
          },
          {
            text: response.data.User.name,
            disabled: true,
            to: `/users/${id}`,
          },
        ],
      };
    } catch (err) {
      console.log(err);
      return error({
        message: err.message,
        status: 404,
      });
    }
  },
  components: {
    itemSection,
  },
  methods: {
    async submitExchange() {
      const client = this.$apollo.getClient();
      const exchange = this.exchange;
      if (exchange.account.lenth == 0 || exchange.name.length == 0) {
        this.$notify.toast("账户和姓名是必填的!");
        return;
      }
      const branch = exchange.branch;
      const response = await client.mutate({
        mutation: gql`
          mutation createExchange($score: Int, $name: String, ${
            branch.length ? "$branch: String" : ""
          }, $account: String, $type: String) {
            createExchange(data: {account: $account, name: $name, score: $score, ${
              branch.length ? "branch: $branch," : ""
            } type: $type}) {
              id
            }
          }
        `,
        variables: {
          score: exchange.score * 1,
          name: exchange.name,
          account: exchange.account,
          type: exchange.type.value,
          branch: branch.length ? branch : null,
        },
      });
      this.$notify.toast("恭喜您，申请提现成功！");
      this.dialog = false;
    },
  },
  head() {
    return {
      title: this.user.name + "的频道 - 蜂窝创作平台",
    };
  },
};
</script>
<style>
.sign {
  color: rgba(255, 255, 255, 0.7);
}
</style>