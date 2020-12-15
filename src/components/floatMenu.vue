<template>
    <v-speed-dial
      v-model="fab"
      v-if="user && (item.owner.id == user.id)"
      fixed
      bottom
      right
      direction="top"
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-btn v-model="fab" color="blue darken-2" dark fab>
          <v-icon v-if="fab">{{icon.mdiClose}}</v-icon>
          <v-icon v-else>{{icon.mdiAccountCircle}}</v-icon>
        </v-btn>
      </template>
      <v-btn nuxt :to="`/${type}s/${item.id}/edit`" fab dark small color="green">
        <v-icon>{{icon.mdiPencil}}</v-icon>
      </v-btn>
      <v-btn nuxt :to="`/add/${type}`" fab dark small color="indigo">
        <v-icon>{{icon.mdiPlus}}</v-icon>
      </v-btn>
      <v-btn
        v-if="user && item.owner.id == user.id"
        @click="deleteType"
        fab
        dark
        small
        color="red"
      >
        <v-icon>{{icon.mdiDelete}}</v-icon>
      </v-btn>
    </v-speed-dial>
</template>

<script>
import gql from 'graphql-tag';
import {mdiDelete, mdiPlus, mdiPencil, mdiClose, mdiAccountCircle} from '@mdi/js'
export default {
  data() {
    return {
      icon: {
        mdiDelete, mdiPlus, mdiPencil, mdiClose, mdiAccountCircle
      },
      user: this.$store.state.authUser,
      fab: false
    }
  },
  props: {
    item: Object,
    type: String
  },
  methods: {
    async deleteType() {
      const client = this.$apollo.getClient();
      const type = this.type;
      console.log(type);
    }
  }
}
</script>