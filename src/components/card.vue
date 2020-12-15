<template>
  <nuxt-link :to="`/${type}/${item.id}`" :title="item.title">
    <v-card class="elevation-3">
      <v-img v-ripple :aspect-ratio="16 / 10" :src="cover">
      </v-img>
      <v-card-title class="text-truncate d-block text-subtitle-1">{{
        item.title
      }}</v-card-title>
      <v-card-subtitle>
        <v-list-item two-line class="ma-0 pa-0">
          <v-list-item-avatar class="my-2" color="grey darken-3">
            <span>{{ item.owner.name.substring(0, 1) }}</span>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>{{ item.owner.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption"
              >发布于
              {{ $moment(item.createdAt).fromNow() }}</v-list-item-subtitle
            >
          </v-list-item-content>
        </v-list-item>
      </v-card-subtitle>
    </v-card>
  </nuxt-link>
</template>
<script>
export default {
    props: {
        item: Object,
        cover: String,
        type: String
    }
}
</script>