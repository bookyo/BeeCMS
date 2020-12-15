<template>
  <v-card>
    <v-tabs center-active dark optional show-arrows>
      <v-tabs-slider class="pa-0"></v-tabs-slider>
      <v-tab
        :style="$vuetify.breakpoint.mobile ? 'min-width:60px' : ''"
        nuxt
        exact
        :to="`/${type}`"
        >全部</v-tab
      >
      <v-tab
        :style="$vuetify.breakpoint.mobile ? 'min-width:60px' : ''"
        v-for="tag in items"
        :key="tag.id"
        nuxt
        :to="`/${type}/tag/${tag.id}`"
        >{{ tag.title }}</v-tab
      >
    </v-tabs>
  </v-card>
</template>

<script>
export default {
  props: {
    items: Array,
    type: String
  }
}
</script>