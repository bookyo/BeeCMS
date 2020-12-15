<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-breadcrumbs :items="items"></v-breadcrumbs>
      </v-card>
    </v-col>
    <v-col cols="12" md="3" v-for="widget in widgets" :key="widget.title">
      <widget :title="widget.title" :color="widget.color" :icon="widget.icon" :count="widget.count"></widget>
    </v-col>
    <v-col cols="12" md="6" v-for="table in cardTables" :key="table">
      <cardTable :type="table"></cardTable>
    </v-col>
  </v-row>
</template>

<script>
import widget from '~/components/widget';
import cardTable from '~/components/cardTable';
import gql from 'graphql-tag';
import { mdiMovie, mdiBookOpen, mdiImageMultiple, mdiBee } from "@mdi/js";
export default {
  async asyncData({app, params, store}) {
    const client = app.apolloProvider.defaultClient;
    const response = await client.query({
      query: gql`
        query getCounts {
          _allVideosMeta {
            count
          }
          _allComicsMeta {
            count
          }
          _allNovelsMeta {
            count
          }
          _allBeesMeta {
            count
          }
        }
      `
    });
    const videoCounts = response.data._allVideosMeta.count;
    const comicCounts = response.data._allComicsMeta.count;
    const novelCounts = response.data._allNovelsMeta.count;
    const beeCounts = response.data._allBeesMeta.count;
    return {
      widgets: [
        {
          title: "视频总数",
          count: videoCounts,
          color: "primary",
          icon: mdiMovie
        },
        {
          title: "漫画总数",
          count: comicCounts,
          color: "warning",
          icon: mdiImageMultiple
        },
        {
          title: "小说总数",
          count: novelCounts,
          color: "deep-purple",
          icon: mdiBookOpen
        },
        {
          title: "蜂窝号总数",
          count: beeCounts,
          color: "error",
          icon: mdiBee
        },
      ]
    }
  },
  data() {
    return {
      mdiMovie,
      mdiBookOpen,
      mdiImageMultiple,
      mdiBee,
      items: [
        {
          text: "控制台",
          disabled: true,
          to: "/beecms",
        },
      ],
      cardTables: [
        "Video", "Comic", "Novel", "Bee"
      ]
    };
  },
  components: {
    widget,
    cardTable
  },
  head() {
    return {
        title: '控制台 - 蜂窝创作平台'
    };
  },
};
</script>