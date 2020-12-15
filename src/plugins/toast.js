import Vue from 'vue'
import VuetifyNotify from 'vuetify-notify'

export default ({ app }, inject) => {
  window.onNuxtReady(() => {
    Vue.use(VuetifyNotify, {
      vuetify: app.vuetify,
      container: '__nuxt',
      options: {
        toast: {
          x: 'center',
          y: 'top',
          color: 'primary'
        },
        dialog: {
          width: 300
        }
      }
    })
  })
}