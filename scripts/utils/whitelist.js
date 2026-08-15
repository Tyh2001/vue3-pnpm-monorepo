// 已知的通过全局注册/模板使用的包，不视为冗余依赖
module.exports = {
  // Vue 组件库，通过模板使用（如 <fighting-button>），不在 import 中出现
  'fighting-design': true,
  'fighting': true,

  // Element Plus 及图标，通过全局注册 app.use(ElementPlus)
  'element-plus': true,
  '@element-plus/icons-vue': true,

  // 构建工具依赖，源码中 import 但不需要在 package.json 声明
  'vite': true,
  '@vitejs/plugin-vue': true,

  // Workspace 内部包，devDependencies 中用 workspace:* 声明
  '@vue3-pnpm-monorepo/my-utils': true,

  // Vue 核心依赖，SDK 包通常需要
  'vue': true,

  // 其他常见的全局注册包
};
