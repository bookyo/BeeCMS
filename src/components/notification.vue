<template>
  <v-snackbar v-model="snackbar" :color="color" :timeout="4000" right top>
    {{ message }}
    <v-btn dark flat @click="snackbar = false">
      关闭
    </v-btn>
  </v-snackbar>
</template>

<script>
export default {
  props: {
    color: {
      type: String,
      default: () => {
        return "info"
      }
    },
    message: {
      type: String,
      default: () => {}
    }
  },
  data: () => ({
    snackbar: false
  }),
  watch: {
    message(newm, oldm) {
      this.snackbar = true
    }
  }
}
</script>