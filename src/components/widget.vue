<template>
  <v-card>
    <v-card-text>
      <div class="d-flex align-center">
        <v-btn fab :color="color">
          <v-icon>{{ icon }}</v-icon>
        </v-btn>
        <div class="ml-2 mr-1">
          <h2 class="mb-0">{{title}}</h2>
          <h5 class="body-1">{{count}}</h5>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  props: {
    color: String,
    title: String,
    count: Number,
    icon: String,
  }
}
</script>