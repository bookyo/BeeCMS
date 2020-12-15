<template>
  <div>
    <v-row class="mx-auto pa-3">
      <v-col cols="6" sm="3" class="pa-0">
        <hero
          title="影视"
          :icon="mdiMovie"
          to="/videos"
          background="/1.jpg"
        ></hero>
      </v-col>
      <v-col cols="6" sm="3" class="pa-0">
        <hero
          title="小说"
          :icon="mdiBookOpen"
          to="/novels"
          background="/2.jpg"
        ></hero>
      </v-col>
      <v-col cols="6" sm="3" class="pa-0">
        <hero
          title="漫画"
          :icon="mdiImageMultiple"
          to="/comics"
          background="/3.jpg"
        ></hero>
      </v-col>
      <v-col cols="6" sm="3" class="pa-0">
        <hero
          title="蜂窝号"
          :icon="mdiBee"
          to="/bees"
          background="/4.jpg"
        ></hero>
      </v-col>
    </v-row>
    <v-row class="mx-auto mt-5">
      <header-title title="影视" url="/videos">
        <v-chip-group
          class="flex-grow-0 flex-shrink-0 ml-5 d-sm-flex d-none"
          active-class="primary--text"
        >
          <v-chip
            outlined
            v-for="tag in pushTags('video')"
            :key="tag.id"
            @click="changeData(tag, 'Video')"
          >
            {{ tag.title }}
          </v-chip>
        </v-chip-group>
      </header-title>
      <v-col cols="12" sm="3" v-for="video in this.videos" :key="video.id">
        <card :item="video" type="videos" :cover="video.cover"></card>
      </v-col>
    </v-row>
    <v-row class="mx-auto mt-5">
      <header-title title="漫画" url="/comics">
        <v-chip-group
          class="flex-grow-0 flex-shrink-0 ml-5 d-sm-flex d-none"
          active-class="primary--text"
        >
          <v-chip
            outlined
            v-for="tag in pushTags('comic')"
            :key="tag.id"
            @click="changeData(tag, 'Comic')"
          >
            {{ tag.title }}
          </v-chip>
        </v-chip-group>
      </header-title>
      <v-col cols="12" sm="3" v-for="comic in comics" :key="comic.id">
        <card :item="comic" type="comics" :cover="comic.cover.file.publicUrl"></card>
      </v-col>
    </v-row>
    <v-row class="mx-auto mt-5">
      <header-title title="小说" url="/novels">
        <v-chip-group
          class="flex-grow-0 flex-shrink-0 ml-5 d-sm-flex d-none"
          active-class="primary--text"
        >
          <v-chip
            outlined
            v-for="tag in pushTags('novel')"
            :key="tag.id"
            @click="changeData(tag, 'Novel')"
          >
            {{ tag.title }}
          </v-chip>
        </v-chip-group>
      </header-title>
      <v-col cols="12" sm="3" v-for="novel in novels" :key="novel.id">
        <card :item="novel" type="novels" :cover="novel.cover.file.publicUrl"></card>
      </v-col>
    </v-row>
    <v-row class="mx-auto mt-5">
      <header-title title="蜂窝号" url="/bees">
        <v-chip-group
          class="flex-grow-0 flex-shrink-0 ml-5 d-sm-flex d-none"
          active-class="primary--text"
        >
          <v-chip
            outlined
            v-for="tag in pushTags('bee')"
            :key="tag.id"
            @click="changeData(tag, 'Bee')"
          >
            {{ tag.title }}
          </v-chip>
        </v-chip-group>
      </header-title>
      <v-col cols="12" sm="3" v-for="bee in bees" :key="bee.id">
        <card :item="bee" type="bees" :cover="bee.cover.file.publicUrl"></card>
      </v-col>
    </v-row>
  </div>
</template>
<style>
.index-link {
  text-decoration: none;
}
.v-image__image {
  transition: all 0.2s ease-out;
}
.index-link:hover .v-image__image {
  -webkit-transform: scale(1.05);
  transform: scale(1.05);
}
</style>
<script>
import gql from "graphql-tag";
import { mdiMovie, mdiBookOpen, mdiImageMultiple, mdiBee } from "@mdi/js";
import hero from "~/components/hero";
import headerTitle from "~/components/headerTitle";
import card from '~/components/card';
export default {
  async asyncData({ app, params, redirect, error }) {
    const client = app.apolloProvider.defaultClient;
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
          },
          allVideos(first: 8, sortBy: createdAt_DESC, where: {status: "published"}) {
            title,
            id,
            createdAt,
            owner {
              id,
              name
            },
            cover
          },
          allComics(first: 8, sortBy: createdAt_DESC, where: {status: "published"}) {
            title,
            id,
            createdAt,
            owner {
              id,
              name
            }
            cover {
              id
              file {
                id
                publicUrl
              }
            }
          },
          allNovels(first: 8, sortBy: createdAt_DESC, where: {status: "published"}) {
            title,
            id,
            createdAt,
            owner {
              id,
              name
            }
            cover {
              id
              file {
                id
                publicUrl
              }
            }
          },
          allBees(first: 8, sortBy: createdAt_DESC, where: {status: "published"}) {
            title,
            id,
            createdAt,
            owner {
              id,
              name
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
    });
    let tags = [];
    const pushTags = response.data.allPushTags;
    const videos = response.data.allVideos;
    const comics = response.data.allComics;
    const novels = response.data.allNovels;
    const bees = response.data.allBees;
    if (pushTags.length) {
      tags = pushTags;
    }
    return { tags, videos, comics, novels, bees};
  },
  methods: {
    pushTags(type) {
      const pushTag = this.tags.filter((tag) => tag.type == type);
      return pushTag[0].tags.slice(0, 5);
    },
    async changeData(tag, type) {
      const client = this.$apollo.getClient();
      const response = await client.query({
        query: gql`
          query getData($tagId: ID!) {
            all${type}s(first: 8, sortBy: createdAt_DESC, where: {tags_some: {id: $tagId}, status: "published"}) {
              title,
              id,
              createdAt,
              owner {
                id,
                name
              },
              ${type=='Video'? "cover" : "cover { id, file{id, publicUrl}}"}
            }
          }
        `,
        variables: {tagId: tag.id}
      });
      this[type.toLowerCase() + 's'] = response.data['all' + type + 's'];
    },
  },
  data() {
    return {
      mdiMovie,
      mdiBookOpen,
      mdiImageMultiple,
      mdiBee,
    };
  },
  components: {
    hero,
    headerTitle,
    card
  },
  head() {
    return {
      title: `蜂窝创作平台，让每个人都能创作 - BeeCMS`
    }
  }
};
</script>