<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-subheader>{{title}}</v-subheader>
        <v-divider />
      </v-col>
      <v-col cols="12" sm="3" v-for="item in items" :key="item.id">
        <card
          :item="item"
          :type="type"
          :cover="cover(item)"
        ></card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import card from "~/components/card";
export default {
  props: {
    items: Array,
    title: String,
    type: String,
  },
  components: {
    card
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