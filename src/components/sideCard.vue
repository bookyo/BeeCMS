<template>
  <nuxt-link class="mb-3 d-block" :to="`/${type}/${item.id}`" style="color: white">
    <div class="d-flex">
      <v-img
        v-ripple
        :aspect-ratio="16 / 10"
        :src="cover(item)"
        max-width="120"
        min-width="120"
        min-height="84"
        max-height="84"
      >
      </v-img>
      <div class="d-flex flex-column ml-3 text-truncate justify-space-between">
        <h3 class="right-title ma-0 text-truncate webkit-line2">{{item.title}}</h3>
        <v-list-item class="pa-0 ma-0" two-line style="min-height: auto;flex:0;">
          <v-list-item-content class="pa-0">
            <v-list-item-title class="text-caption text--secondary">
              {{item.owner.name}}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              发布于
              {{ $moment(item.createdAt).fromNow() }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </div>
    </div>
  </nuxt-link>
</template>

<script>
export default {
  props: {
    type: String,
    item: Object
  },
  methods: {
    cover(item) {
      if(!item.cover) {
        return '/review.png'
      };
      return item.cover.file ? item.cover.file.publicUrl : item.cover;
    }
  }
}
</script>