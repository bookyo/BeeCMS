<template>
  <v-row class="mx-auto">
    <v-col cols="12">
      <v-card>
        <v-card-title>购买积分</v-card-title>
        <v-card-text>
          <v-select
            :items="stores"
            item-text="score"
            item-value="id"
            no-data-text="选择积分"
            v-model="product"
            mandatory
            filled
            return-object
            label="选择您要购买多少积分"
          >
            <template v-slot:item="data">
              {{ data.item.score }}({{data.item.price + '元'}})
            </template>
            <template v-slot:selection="data">
              {{ data.item.score }}({{data.item.price + '元'}})
            </template>
          </v-select>
          <v-select
            :items="pays"
            @change="selectPay"
            item-text="type"
            item-value="id"
            no-data-text="选择支付平台"
            v-model="pay"
            mandatory
            filled
            return-object
            label="选择您使用的支付平台"
          ></v-select>
          <v-select
            v-if="pay.type=='codePay'"
            :items="pay.payType"
            item-text="name"
            item-value="id"
            no-data-text="选择支付方式"
            v-model="payType"
            mandatory
            filled
            return-object
            label="选择您使用的支付方式"
          ></v-select>
          <v-btn @click="createOrder">点击购买</v-btn>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import gql from 'graphql-tag';
export default {
  async asyncData({app, store, error}) {
    const client = app.apolloProvider.defaultClient;
    const user = store.state.authUser;
    if (!user) {
      return error({
        message: "对不起，请登录！",
        status: 403,
      });
    }
    const response = await client.query({
      query: gql`
        query getData {
          allStores {
            id
            score
            price
          }
          allPays {
            id
            type
            payType {
              id
              type
              name
            }
          }
        }
      `
    });
    const stores = response.data.allStores;
    const pays = response.data.allPays;
    return {
      stores,
      pays,
      product: stores[0],
      pay: pays[0],
      payType: null
    }
  },
  methods: {
    selectPay() {
      console.log(pay);
    },
    async createOrder() {
      const client = this.$apollo.getClient();
      if(this.pay.type == 'codePay') {
        if(!this.payType) {
          this.$notify.toast('请选择支付方式');
          return;
        }
        let type = 1;
        switch (this.payType.type) {
          case 'aliPay':
            type = 1
            break;
          case 'qqPay':
            type = 2
            break;
          case 'wechatPay':
            type = 3
            break;
        
          default:
            break;
        };
        const response = await client.mutate({
          mutation: gql`
            mutation createOrder($productId:ID!) {
              createOrder(data: {goods: {connect: {id: $productId}}}) {
                id
              }
            }
          `,
          variables: {productId: this.product.id}
        });
        const orderId = response.data.createOrder.id;
        const payUrlResponse = await client.query({
          query: gql`
            query getUrl($id: ID!, $type: Int!) {
              getCodePayUrl(id: $id, type: $type)
            }
          `,
          variables: {id: orderId, type: type}
        });
        const payUrl = payUrlResponse.data.getCodePayUrl;
        location.href = payUrl;
      };
      // 1是支付宝， 2是QQ支付， 3是微信支付。
    }
  }
}
</script>