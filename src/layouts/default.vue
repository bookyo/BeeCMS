<template>
  <v-app id="inspire">
    <v-navigation-drawer v-model="drawer" app clipped>
      <v-list nav shaped>
        <v-list-item link exact nuxt to="/">
          <v-list-item-icon>
            <v-icon>{{mdiHome}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>首页</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="user && user.isAdmin" link exact nuxt to="/beecms">
          <v-list-item-icon>
            <v-icon>{{mdiDesktopMac}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>控制台</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link nuxt :to="`${path}/videos`">
          <v-list-item-icon>
            <v-icon>{{mdiMovie}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>视频</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link nuxt :to="`${path}/novels`">
          <v-list-item-icon>
            <v-icon>{{mdiBookOpen}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>小说</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link nuxt :to="`${path}/comics`">
          <v-list-item-icon>
            <v-icon>{{mdiImageMultiple}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>漫画</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link nuxt :to="`${path}/bees`">
          <v-list-item-icon>
            <v-icon>{{mdiBee}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>蜂窝号</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="path == '/beecms'" link nuxt to="/beecms/tags">
          <v-list-item-icon>
            <v-icon>{{mdiTag}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>标签</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="path == '/beecms'" link nuxt to="/beecms/setting/cloudserver">
          <v-list-item-icon>
            <v-icon>{{mdiCog}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>设置</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-group
          v-if="this.$store.state.authUser"
          color="primary"
          :prepend-icon="mdiAccountCircle"
          no-action
        >
          <template v-slot:activator>
            <v-list-item-content>
              <v-list-item-title>我的</v-list-item-title>
            </v-list-item-content>
          </template>
          <v-list-item nuxt to="/add/video">
            <v-list-item-content>
              <v-list-item-title>上传视频</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item nuxt to="/add/novel">
            <v-list-item-title>发布小说</v-list-item-title>
          </v-list-item>
          <v-list-item nuxt to="/add/comic">
            <v-list-item-title>发布漫画</v-list-item-title>
          </v-list-item>
          <v-list-item nuxt to="/add/bee">
            <v-list-item-title>创作蜂窝号</v-list-item-title>
          </v-list-item>
          <v-list-item nuxt :to="`/users/${this.$store.state.authUser.id}`">
            <v-list-item-title>个人主页</v-list-item-title>
          </v-list-item>
          <v-list-item nuxt :to="`/store`">
            <v-list-item-title>购买积分</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="this.$store.state.authUser.isAdmin" nuxt :to="`/beecms`">
            <v-list-item-title>管理中心</v-list-item-title>
          </v-list-item>
          <v-list-item @click="logout">
            <v-list-item-title>退出</v-list-item-title>
          </v-list-item>
        </v-list-group>
        <v-list-item v-else @click="loginDialog = true">
          <v-list-item-icon>
            <v-icon>{{mdiAccountCircle}}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>登录</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar ref="toolbar" v-mutate="onMutate" app clipped-left>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-items class="d-none d-sm-flex">
        <v-btn
          text
          to="/"
        >蜂窝创作平台</v-btn>
      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-responsive class="my-auto" max-width="600">
        <v-text-field
          v-model="q"
          solo
          :prepend-inner-icon="mdiMagnify"
          background-color="#303030"
          hide-details
          flat
          dense
          color="primary"
          placeholder="搜索视频、小说、漫画及蜂窝文章"
          @change="gosearch()"
        ></v-text-field>
      </v-responsive>
      <v-spacer></v-spacer>
      <div class="d-none d-sm-flex">
        <v-menu offset-y v-if="this.$store.state.authUser" class="d-none d-sm-flex">
          <template v-slot:activator="{ on, attrs }">
            <v-btn size="20" v-on="on" v-bind="attrs">
              <v-icon dark>{{mdiPencil}}</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item nuxt to="/add/video">
              <v-list-item-title>上传视频</v-list-item-title>
            </v-list-item>
            <v-list-item nuxt to="/add/novel">
              <v-list-item-title>发布小说</v-list-item-title>
            </v-list-item>
            <v-list-item nuxt to="/add/comic">
              <v-list-item-title>发布漫画</v-list-item-title>
            </v-list-item>
            <v-list-item nuxt to="/add/bee">
              <v-list-item-title>创作蜂窝号</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-menu offset-y v-if="this.$store.state.authUser" class="d-none d-sm-flex">
          <template v-slot:activator="{ on, attrs }">
            <v-btn size="20" v-on="on" v-bind="attrs">
              <v-icon dark>{{mdiAccountCircle}}</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item nuxt :to="`/users/${this.$store.state.authUser.id}`">
              <v-list-item-title>个人主页</v-list-item-title>
            </v-list-item>
            <v-list-item nuxt :to="`/store`">
              <v-list-item-title>购买积分</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="this.$store.state.authUser.isAdmin" nuxt :to="`/beecms`">
              <v-list-item-title>管理中心</v-list-item-title>
            </v-list-item>
            <v-list-item @click="logout">
              <v-list-item-title>退出</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <v-btn
        v-if="!this.$store.state.authUser"
        class="d-none d-sm-flex"
        @click.stop="loginDialog = true"
      >登录</v-btn>
      <v-btn
        v-if="!this.$store.state.authUser"
        class="d-none d-sm-flex"
        @click.stop="regDialog = true"
      >注册</v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <nuxt />
      </v-container>
    </v-main>

    <v-footer app>
      <span>&copy; {{new Date().getFullYear()}} Beecms</span>
      <v-spacer/>
      <a href="https://www.iqi360.com/p/BeeCMS" target="_blank" style="text-decoration: none;color:#fff;">蜂窝创作平台</a>
    </v-footer>
    <v-dialog v-model="loginDialog" max-width="600">
      <v-card>
        <v-card-title>登录Beecms</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid" lazy-validation>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    type="text"
                    v-model="email"
                    :rules="emailRules"
                    label="邮箱地址*"
                    hint="输入正确的邮箱地址"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    type="password"
                    v-model="password"
                    :rules="passwordRules"
                    label="密码*"
                    hint="输入密码"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="loginDialog = false">关闭</v-btn>
          <v-btn color="success" @click="regDialog = true">注册</v-btn>
          <v-btn class="primary" @click="login" :disabled="!valid">登录</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="regDialog" max-width="600">
      <v-card>
        <v-card-title>注册Beecms</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid" lazy-validation>
            <v-container>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    dense
                    v-model="name"
                    :rules="nameRules"
                    type="text"
                    label="用户昵称*"
                    hint="输入英文、数字、中文组成用户名"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    dense
                    v-model="email"
                    :rules="emailRules"
                    type="text"
                    label="邮箱地址*"
                    hint="输入正确的邮箱地址"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    dense
                    v-model="password"
                    :rules="passwordRules"
                    type="password"
                    label="密码*"
                    hint="输入密码"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    dense
                    v-model="code"
                    :rules="codeRules"
                    type="text"
                    label="邮箱验证码*"
                    hint="输入邮箱验证码"
                    required
                  >
                    <v-btn @click="sendSms" :disabled="!sendding" slot="append" text>{{verifytext}}</v-btn>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="regDialog = false">关闭</v-btn>
          <v-btn class="primary" :disabled="!valid" @click="reg">注册</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>
<style>
.v-application {
  font-family: Roboto, 'pingfang SC','helvetica neue',arial,'hiragino sans gb','microsoft yahei ui','microsoft yahei',simsun,sans-serif;
}
</style>
<script>
import {
  mdiGithub,
  mdiMagnify,
  mdiAccountCircle,
  mdiMovie,
  mdiBookOpen,
  mdiImageMultiple,
  mdiCloud,
  mdiPencil,
  mdiBee,
  mdiDesktopMac,
  mdiCog,
  mdiTag,
  mdiHome
} from "@mdi/js";
import gql from "graphql-tag";
export default {
  data() {
    return {
      drawer: null,
      mdiGithub,
      mdiAccountCircle,
      mdiMagnify,
      mdiMovie,
      mdiBookOpen,
      mdiImageMultiple,
      mdiCloud,
      mdiPencil,
      mdiHome,
      mdiBee,
      mdiCog,
      mdiTag,
      mdiDesktopMac,
      email: "",
      emailRules: [
        (v) => !!v || "邮箱地址是必填项",
        (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v) || "请输入正确的邮箱地址！",
      ],
      password: "",
      passwordRules: [
        (v) => !!v || "密码是必填项",
        (v) => v.length > 7 || "密码必须8位以上！",
      ],
      name: "",
      q: "",
      nameRules: [
        (v) => !!v || "用户名是必填项",
        (v) =>
          /^[\u4e00-\u9fa5A-Za-z0-9\-\_]{2,30}$/.test(v) ||
          "用户名只能是英文、中文和数字",
      ],
      code: "",
      codeRules: [
        (v) => !!v || "验证码是必填项",
        (v) => /^[0-9]{4}$/.test(v) || "验证码只能为4位数字组合！",
      ],
      valid: true,
      loginDialog: false,
      verifytext: "验证码",
      totaltime: 60,
      sendding: true,
      regDialog: false,
      user: this.$store.state.authUser,
      path: this.$route.path.indexOf('/beecms') > -1 ? '/beecms': ''
    };
  },
  methods: {
    onMutate () {
      let height = 0
      const toolbar = this.$refs.toolbar
      if (toolbar) {
        height = `${toolbar.$el.offsetHeight}px`
      }
      document.documentElement.style.setProperty('--toolbarHeight', height)
    },
    gosearch: function () {
      if(this.q.length>0) {
        this.$router.push(`/search?q=${this.q}`);
      }
    },
    reg: async function () {
      const formValid = this.$refs.form.validate();
      if (formValid) {
        try {
          await this.$store.dispatch("signup", {
            email: this.email,
            password: this.password,
            name: this.name,
            code: this.code,
          });
          this.regDialog = false;
        } catch (err) {
          console.log(err.message);
          const message = err.message;
          if (message.indexOf("is not a valid email") > -1) {
            this.$notify.toast("邮箱地址格式不正确！");
          } else if (message.indexOf("please resend vertify code") > -1) {
            this.$notify.toast("验证码不正确，请重新点击发送！");
          } else {
            this.$notify.toast("邮箱地址或用户名已注册！");
          }
        }
      }
    },
    login: async function () {
      const formValid = this.$refs.form.validate();
      if (formValid) {
        try {
          await this.$store.dispatch("login", {
            email: this.email,
            password: this.password,
          });
          this.loginDialog = false;
        } catch (error) {
          this.$notify.toast("邮箱地址或密码错误！");
        }
      }
    },
    logout: async function () {
      try {
        await this.$store.dispatch("signout");
      } catch (error) {
        this.$notify.toast(error);
      }
    },
    sendSms: async function () {
      this.sendding = false;
      let clock = window.setInterval(() => {
        this.totaltime--;
        this.verifytext = this.totaltime + "";
        if (this.totaltime < 0) {
          window.clearInterval(clock);
          this.verifytext = "验证码";
          this.totaltime = 60;
          this.sendding = true;
        }
      }, 1000);
      const client = this.$apollo.getClient();
      try {
        const response = await client.mutate({
          mutation: gql`
            mutation sendSms($email: String!) {
              startSendCode(email: $email) {
                id
              }
            }
          `,
          variables: {
            email: this.email,
          },
        });
      } catch (error) {
        console.log(error);
      }
    },
  },
  mounted() {
    this.onMutate();
    if (document.getElementsByClassName("v-navigation-drawer__content")) {
      new SimpleBar(
        document.getElementsByClassName("v-navigation-drawer__content")[0]
      );
    }
  },
  watch: {
    //监听路由变化
    $route(to, from) {
      if(to.path.indexOf('/beecms')==-1) {
        this.path = '';
      } else {
        this.path = '/beecms';
      }
    }
  },
  created() {
    this.$vuetify.theme.dark = true;
  },
};
</script>