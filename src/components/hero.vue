<template>
  <nuxt-link class="index-link" :to="to">
    <v-img
      v-ripple
      class="align-end"
      :aspect-ratio="9 / 16"
      :src="background"
      gradient="0deg, #1b1b1b 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 80%, rgba(27, 27, 27, 0.650297619) 100%"
    >
      <div class="d-flex align-center flex-wrap flex-column pb-5">
        <v-icon
          :size="$vuetify.breakpoint.mobile ? 30 : 60"
          class="justify-center"
          >{{ icon }}</v-icon
        >
        <h2
          :class="$vuetify.breakpoint.mobile ? 'text-h6' : 'text-h4'"
          class="text-center mt-2 mb-4 mt-sm-6 mb-sm-12"
        >
          {{ title }}
        </h2>
      </div>
    </v-img>
  </nuxt-link>
</template>
<script>
export default {
  props: {
    title: String,
    icon: String,
    background: String,
    to: String,
  },
}
</script>