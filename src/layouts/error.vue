<template>
  <section class="section">
      <div class="container">
        <h1 v-if="error.statusCode === 404" class="title">{{error.message || '页面未找到！'}}</h1>
        <h1 v-else class="title">{{error.message}}</h1>
        <p class="subtitle">
            <nuxt-link to="/">返回首页</nuxt-link>
        </p>
      </div>
  </section>
</template>

<script>
export default {
  props: ['error'],
  layout: 'default' // 你可以为错误页面指定自定义的布局
}
</script>