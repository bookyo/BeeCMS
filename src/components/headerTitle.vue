<template>
  <v-col cols="12" md="12" class="mx-auto">
    <div class="d-flex justify-space-between mb-3 align-center flex-wrap">
      <div class="d-flex align-center flex-wrap">
        <h2 class="text-h5 flex-grow-1 flex-shrink-0">{{title}}</h2>
        <slot></slot>
      </div>
      <v-btn nuxt outlined :to="url">全部</v-btn>
    </div>
    <v-divider />
  </v-col>
</template>
<script>
export default {
  name: 'headerTitle',
  props: {
    url: String,
    title: String,
  }
}
</script>