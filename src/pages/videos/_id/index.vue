<template>
  <v-row class="mx-auto">
    <v-col cols="12" sm="8">
      <v-img
        v-if="
          !video.cover ||
          video.status != 'published' ||
          theEpisode.status != 'published'
        "
        src="/review.png"
        :aspect-ratio="16 / 10"
      ></v-img>
      <div
        v-else-if="allowRead"
        class="player-wrapper"
      >
        <div id="player" ref="dplayer"></div>
      </div>
      <v-card v-else>
        <v-card-text>
          <div class="order-warning">
            <p>本内容需要点数付费购买，所需积分为：{{ theEpisode.price }}</p>
            <v-btn @click="pointOrder">点击购买</v-btn>
          </div>
        </v-card-text>
      </v-card>
      <div class="d-flex">
        <h1 class="text-h5 my-4">{{ video.title }}</h1>
      </div>
      <v-divider />
      <div class="d-flex align-center">
        <userInfo :user="video.owner" :createdAt="video.createdAt"> </userInfo>
      </div>
      <v-card>
        <v-card-text>
          <p>{{ video.content }}</p>
          <v-chip
            class="ma-1"
            small
            v-for="tag in video.tags"
            :key="tag.id"
            nuxt
            :to="`/videos/tag/${tag.id}`"
          >
            {{ tag.title }}
          </v-chip>
        </v-card-text>
      </v-card>
      <v-card class="mt-5" v-if="$vuetify.breakpoint.xsOnly">
        <v-card-title>分集</v-card-title>
        <v-card-text>
          <v-chip-group
            column
            mandatory
            class="flex-grow-0 flex-shrink-0"
            active-class="primary--text"
            v-model="selectEpisode"
          >
            <v-chip
              label
              @click="changeEpisode(episode)"
              outlined
              v-for="episode in video.episodes"
              :key="episode.id"
            >
              {{ episode.title }}
              <v-icon v-if="episode.price" right color="orange">{{
                mdiStarCircleOutline
              }}</v-icon>
            </v-chip>
          </v-chip-group>
        </v-card-text>
      </v-card>
      <v-card class="mt-5" v-if="$vuetify.breakpoint.xsOnly">
        <v-card-title>视频推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="video in randomVideos"
            :key="video.id"
            :item="video"
            type="videos"
          >
          </side-card>
        </v-card-text>
      </v-card>
      <v-card class="mt-5">
        <v-card-title>评论区</v-card-title>
        <v-card-text> 暂未开放 </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" sm="4" v-if="$vuetify.breakpoint.smAndUp">
      <v-card>
        <v-card-title>分集</v-card-title>
        <v-card-text>
          <v-chip-group
            column
            mandatory
            class="flex-grow-0 flex-shrink-0"
            active-class="primary--text"
            v-model="selectEpisode"
          >
            <v-chip
              label
              @click="changeEpisode(episode)"
              outlined
              v-for="episode in video.episodes"
              :key="episode.id"
            >
              {{ episode.title }}
              <v-icon v-if="episode.price" right color="orange">{{
                mdiStarCircleOutline
              }}</v-icon>
            </v-chip>
          </v-chip-group>
        </v-card-text>
      </v-card>
      <v-card class="mt-5">
        <v-card-title>视频推荐</v-card-title>
        <v-card-text>
          <side-card
            v-for="video in randomVideos"
            :key="video.id"
            :item="video"
            type="videos"
          >
          </side-card>
        </v-card-text>
      </v-card>
    </v-col>
    <floatMenu :item="video" type="video"></floatMenu>
  </v-row>
</template>
<style>
.dplayer-video-wrap .dplayer-video {
  max-height: 500px;
}
.dplayer-video-wrap .max {
  max-height: 100%;
}
</style>
<script>
import gql from "graphql-tag";
import userInfo from "~/components/userInfo";
import sideCard from "~/components/sideCard";
import floatMenu from "~/components/floatMenu";
import { mdiStarCircleOutline } from "@mdi/js";
import VueScript2 from "vue-script2";
export default {
  async asyncData({ app, params, store, error }) {
    const client = app.apolloProvider.defaultClient;
    const id = params.id;
    const response = await client.query({
      query: gql`
        query getVideo($id: ID!) {
          Video(where: { id: $id }) {
            id
            title
            content
            status
            cover
            createdAt
            tags {
              id
              title
            }
            owner {
              id
              name
            }
            episodes {
              id
              status
              title
              price
              url
              from
              owner {
                id
              }
            }
          }
        }
      `,
      variables: { id: id },
      errorPolicy: "all",
      fetchPolicy: "no-cache",
    });
    const video = response.data.Video;
    const user = store.state.authUser;
    if (video.status != "published") {
      if (!user) {
        return error({
          message: "本内容审核中或暂不对外公开！",
          status: 404,
        });
      }
      if (user.id != video.owner.id && !user.isAdmin) {
        return error({
          message: "本内容审核中或暂不对外公开！",
          status: 404,
        });
      }
    }
    let allowRead = true;
    const theEpisode = video.episodes[0];
    if (theEpisode.status != "published") {
      allowRead = false;
    } else {
      if (theEpisode.price > 0) {
        if (!user) {
          allowRead = false;
        } else {
          if (user.id == theEpisode.owner.id) {
            allowRead = true;
          } else {
            const orderResponse = await client.query({
              query: gql`
                query getPointOrder($typeId: String, $userId: ID!) {
                  allPointOrders(
                    where: {
                      typeId: $typeId
                      type: "Episode"
                      owner: { id: $userId }
                    }
                  ) {
                    id
                  }
                }
              `,
              variables: { typeId: theEpisode.id, userId: user.id },
              fetchPolicy: "no-cache",
            });
            if (orderResponse.data.allPointOrders.length) {
              allowRead = true;
            } else {
              allowRead = false;
            }
          }
        }
      }
    }
    return {
      theEpisode,
      allowRead,
      video,
      id,
      player: null,
      randomVideos: [],
      selectEpisode: 0,
      mdiStarCircleOutline,
      user: store.state.authUser,
    };
  },
  components: {
    sideCard,
    userInfo,
    floatMenu,
  },
  async mounted() {
    this.getRandomVideos();
    if (this.video.status != "published") {
      return;
    }
    if (!this.video.cover) {
      return;
    }
    if (!this.allowRead) {
      return;
    }
    await this.initPlayer();
  },
  methods: {
    async changeEpisode(episode) {
      const root = this;
      const user = this.user;
      const client = this.$apollo.getClient();
      if (this.theEpisode == episode) {
        console.log(this.player);
        return;
      }
      this.theEpisode = episode;
      if (episode.status != "published") {
        this.$notify.toast("此分集还未审核通过或未公开！");
        return;
      }
      if (episode.price == 0) {
        root.allowRead = true;
        if (this.player) {
          this.player.destroy();
        }
        root.$nextTick(async () => {
          await root.initPlayer();
        });
      } else {
        // 以下是分集的价格>0的情况
        if (!user) {
          root.allowRead = false;
        } else {
          if (user.id == root.theEpisode.owner.id) {
            root.allowRead = true;
          } else {
            const orderResponse = await client.query({
              query: gql`
                query getPointOrder($typeId: String, $userId: ID!) {
                  allPointOrders(
                    where: {
                      typeId: $typeId
                      type: "Episode"
                      owner: { id: $userId }
                    }
                  ) {
                    id
                  }
                }
              `,
              variables: { typeId: root.theEpisode.id, userId: user.id },
              fetchPolicy: "no-cache",
            });
            if (orderResponse.data.allPointOrders.length) {
              root.allowRead = true;
            } else {
              root.allowRead = false;
            }
          }
        }
        if (root.allowRead) {
          if (root.player) {
            root.player.destroy();
          }
          await root.initPlayer();
        } else {
          if (root.player) {
            root.player.destroy();
          }
        }
      }
    },
    async pointOrder() {
      const client = this.$apollo.getClient();
      const user = this.$store.state.authUser;
      const root = this;
      const notify = this.$notify;
      if (!user) {
        notify.toast("请先登录！");
        return;
      }
      notify
        .confirm(
          {
            title: "确定花费" + this.theEpisode.price + "购买此内容？",
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
              const response = await client.mutate({
                mutation: gql`
                  mutation createPointOrder($typeId: String) {
                    createPointOrder(
                      data: { type: "Episode", typeId: $typeId }
                    ) {
                      id
                    }
                  }
                `,
                variables: { typeId: root.theEpisode.id },
              });
              const contentResponse = await client.query({
                query: gql`
                  query getUrl($id: ID!) {
                    Episode(where: { id: $id }) {
                      id
                      url
                    }
                  }
                `,
                variables: { id: root.theEpisode.id },
                fetchPolicy: "no-cache",
              });
              root.theEpisode.url = contentResponse.data.Episode.url;
              root.allowRead = true;
            } catch (error) {
              notify.toast(error.message);
            }
            if (root.player) {
              root.player.destroy();
            }
            await root.initPlayer();
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    },
    async initPlayer() {
      const root = this;
      let quality = [];
      const urlArr = root.theEpisode.url.split("#");
      urlArr.forEach(function (url) {
        const m3u8Arr = url.split("$");
        if (url.length) {
          quality.push({
            name: m3u8Arr[0],
            url: m3u8Arr[1],
            type: "customHls",
          });
        }
      });
      const video = {
        quality: quality,
        defaultQuality: 0,
        pic: root.video.cover,
        customType: {
          customHls: function (video, player) {
            const hls = new Hls();
            hls.loadSource(video.src);
            hls.attachMedia(video);
          },
        },
      };
      await VueScript2.load(
        "https://cdn.jsdelivr.net/npm/hls.js@0.14.16/dist/hls.min.js"
      );
      VueScript2.load(
        "https://cdn.jsdelivr.net/npm/dplayer@1.26.0/dist/DPlayer.min.js"
      ).then(function () {
        if (root.player) {
          root.player.destroy();
        }
        root.player = new DPlayer({
          container: root.$refs.dplayer,
          video: video,
        });
        root.player.on("resize", function () {
          const playerWrap = document.getElementsByClassName("dplayer-video");
          for (var i = 0; i < playerWrap.length; i++) {
            if (playerWrap[i].classList.contains("max")) {
              // The box that we clicked has a class of bad so let's remove it and add the good class
              playerWrap[i].classList.remove("max");
            } else {
              // The user obviously can't follow instructions so let's alert them of what is supposed to happen next
              playerWrap[i].classList.add("max");
            }
          }
        });
      });
    },
    async getRandomVideos() {
      const client = this.$apollo.getClient();
      const tags = this.video.tags;
      let tagsId = [];
      tags.forEach(function (tag) {
        tagsId.push(tag.id);
      });
      const countReponse = await client.query({
        query: gql`
          query getCount($tagsId: [ID]) {
            _allVideosMeta(
              where: { tags_some: { id_in: $tagsId }, status: "published" }
            ) {
              count
            }
          }
        `,
        variables: { tagsId: tagsId },
      });
      const count = countReponse.data._allVideosMeta.count;
      const first = 12;
      let skip = Math.floor(Math.random() * (count - first));
      if (skip < 0) {
        skip = 0;
      }
      const response = await client.query({
        query: gql`
          query getRandomVideos($first: Int, $skip: Int, $tagsId: [ID]) {
            allVideos(
              first: $first
              skip: $skip
              where: { tags_some: { id_in: $tagsId }, status: "published" }
            ) {
              id
              title
              owner {
                id
                name
              }
              cover
              createdAt
            }
          }
        `,
        variables: { tagsId, first, skip },
      });
      const videos = response.data.allVideos;
      this.randomVideos = videos;
    },
  },
  head() {
    return {
      title: `${this.video.title} - 在线播放 - BeeCMS`,
    };
  },
};
</script>