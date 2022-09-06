# 使用 vue3 + pnpm 从 0 搭建 monorepo 项目

大家好，我是[田同学](https://github.com/Tyh2001)。一位开源组件库作者，有兴趣可以加我微信：`VirgoTyh`，一起共同学习。

## 前言

随着 `pnpm` 的出现，目前又出现了一种新生的项目结构，叫 `monorepos`。

这篇文章将带着大家从 0 开始构建一个简易的 `monorepos` 项目。

下面演示的项目，我放在了 [vue3-pnpm-monorepo](https://github.com/Tyh2001/vue3-pnpm-monorepo) 仓库中。

## 什么是 monorepo？

在以往的开发中，通常都是一个仓库存放一个项目。比如现在你有三个项目，就需要创建三个远程仓库，如果想要对三个项目进行下载依赖的话，就需要分别对三个项目进行分别的下载，也就是说需要升级三次。

那么 monorepo 的 意思就是，在一个仓库中，可以包含多个项目，这些项目可以是独立的，也可以相互依赖。通常情况下，在项目根目录会有一个 `packages` 目录，内部来存放多个项目。比如下面场景：

当三个项目都需要安装 `lodash`，在以往三个项目分离的情况下，需要在分别在三个项目中，执行：

```shell
npm i lodash
```

但是在 `monorepo` 的项目中，仅仅需要执行一次，就可以实现三个项目都进行共享依赖包，这有点类似于 js 中的作用域一样：

```js
function fun() {
  const text = 6

  function foo1() {
    const num = 1
    console.log(num + text)
  }
  function foo2() {
    const num = 2
    console.log(num + text)
  }
  function foo3() {
    const num = 3
    console.log(num + text)
  }

  return {
    foo1,
    foo2,
    foo3,
  }
}

const { foo1, foo2, foo3 } = fun()
foo1()
foo2()
foo3()
```

上面代码中，在 `fun` 函数内部，每个函数内部都有一个 `num` 属性，这是它们私有的变量，但是在 `fun` 内部，还有一个可以提供所有函数使用的 `text` ，因为每个函数的内部并没有 `text`，所以函数就会向上一层进行查找，最终打印计算的值。

那么 `monorepo` 项目也是使用类似的方式，将公共的依赖项放在公共可以访问的地方，然后每个单独的项目中可能还会有一些私有的依赖项，让几个或多个项目同时共享那些公共依赖项。这样就是可以避免在多个项目开发的时候，导致有些依赖项需要安装多次的情况。

接下来将给大家演示一下如何搭建一个 `monorepo` 的项目。

## 安装 pnpm

`monorepo` 的项目，限制只能使用 [pnpm](https://www.pnpm.cn/) 如果已经安装了 `pnpm` 可以跳过此步骤

安装 `pnpm` 命令：

```shell
npm i pnpm -g
```

## 初始化项目

首先新建一个文件夹，名为 `vue3-pnpm-monorepo`

进入 `vue3-pnpm-monorepo` 文件夹，初始化一个默认的 `package.json` 文件，执行命令：

```shell
pnpm init -y
```

这时 `package.json` 的文件内部应该是这样的：

```json
{
  "name": "vue3-pnpm-monorepo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

先将一些没用的配置项删掉，再新增以下配置：

```json
{
  "private": true
}
```

- `"private": true`：私有的，不会被发布，是管理整个项目，与要发布的 npm 包解耦。详细可参考[这里](https://github.com/stereobooster/package.json#private)。

配置完成之后是是这个样子：

```json
{
  "name": "vue3-pnpm-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {},
  "license": "ISC"
}
```

接下来再新建 `packages` 文件夹，来存放项目。进入 `packages` 目录，我直接初始化三个 `vue3 + ts` 的项目进行演示：

为了保持大家和我的代码同步，创建命令如下：

```shell
npm init vite vue-demo1
npm init vite vue-demo2
npm init vite vue-demo3
```

目前项目结构如下

```
├── packages
|  ├── vue-demo1
|  ├── vue-demo2
|  └── vue-demo3
├── package.json
```

接下来进入到刚才创建的项目中，项目内部结构应该是这样的：

```
├── packages
|  ├── vue-demo1
|  |  ├── .vscode
|  |  ├── public
|  |  ├── src
|  |  ├── .gitignore
|  |  ├── index.html
|  |  ├── package.json
|  |  ├── README.md
|  |  ├── tsconfig.json
|  |  ├── tsconfig.node.json
|  |  └── vite.config.ts
|  ├── vue-demo2
|  └── vue-demo3
├── package.json
```

进入到项目的目录下，打开 `package.json` 文件，是这样的：

```json
{
  "name": "vue-demo1",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.2.25"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^2.2.0",
    "typescript": "^4.5.4",
    "vite": "^2.8.0",
    "vue-tsc": "^0.29.8"
  }
}
```

我们要知道，目前这三个项目是完全一样的，需要的依赖也是完全一样的，所以这些依赖项就可以直接抽离出来，变成公共的依赖项，添加上版本号，另外调试的话也不需要在这里进行调试，也直接删掉，稍加修改这个文件，最后变成这样：

```json
{
  "name": "vue-demo1",
  "private": true,
  "version": "1.0.0"
}
```

将三个项目都按照上面的方式进行修改即可。

## 创建公共依赖配置

接下来就需要将三个公共的依赖项，进行配置到根目录，使用全局的依赖包提供这三个项目使用：

在 根目录下的 `package.json` 新增之前抽离出来的公共配置项，都添加到公共的配置文件中：

```json
{
  "name": "vue3-pnpm-monorepo",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "vue": "^3.2.25"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^2.2.0",
    "typescript": "^4.5.4",
    "vite": "^2.8.0",
    "vue-tsc": "^0.29.8"
  },
  "license": "ISC"
}
```

那么现在还没有调试的方式，可以新增调试的命令，一般启动项目可以使用 `dev:项目名` 来进行分别启动项目，后面跟上需要启动的路径即可

```json
{
  "name": "vue3-pnpm-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:vue-demo1": "vite packages/vue-demo1",
    "dev:vue-demo2": "vite packages/vue-demo2",
    "dev:vue-demo3": "vite packages/vue-demo3"
  },
  "dependencies": {
    "vue": "^3.2.25"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^2.2.0",
    "typescript": "^4.5.4",
    "vite": "^2.8.0",
    "vue-tsc": "^0.29.8"
  },
  "license": "ISC"
}
```

这样配置之后，就可以根据不同的命令，来启动不同的项目了。

接下来就是需要安装依赖进行测试了，不过安装前还需要配置一个特殊的文件 `pnpm-workspace.yaml`，这个文件可以帮助我们在安装公共依赖的情况下，也将 `packages` 下的项目所需要的依赖也同时进行安装。

在根目录创建 `pnpm-workspace.yaml` 文件，内容为：

```yaml
packages:
  - 'packages/*'
```

配置好之后，就可以在根目录执行：

```shell
pnpm i
```

来安装依赖，安装好了之后，我们就会发现，在项目的根目录和分别每个项目中，都会有了 `node_modules` 文件夹。

通过命令启动一下项目：

```shell
pnpm run dev:vue-demo1
pnpm run dev:vue-demo2
pnpm run dev:vue-demo3
```

发现每一个项目都是正常启动的，成功～

## 局部安装依赖项

比如说，我的 `vue-demo1` 的项目中需要安装 `tyh-ui`，而其它的两个项目是不需要的，那么这样的话，就可以将 `tyh-ui` 单独安装到 `vue-demo1` 的项目中，而另外两个项目是不需要的，所以就没必要安装到全局，直接安装到 `vue-demo1` 内部，安装的方式有两种：

- 进入到指定目录去安装

可以直接进入到指定需要安装的目录进行安装，那么进入到 `packages/vue-demo1` 中，执行：

```shell
npm i tyh-ui2
```

完成安装，这样 `vue-demo1` 中就会单独多出一个依赖项进行使用了。

- `--filter` 安装

使用 `--filter` 修饰符可以实现在根目录指定某个目录进行安装，具体命令为：

```shell
pnpm i tyh-ui2 --filter vue-demo1
```

这样也可以实现。

## 全局安装依赖项

添加全局的依赖项的时候，需要在命令后面加上 `-W`。

比如所有的组件都需要使用到 `lodash`，就可以执行：

```shell
pnpm i lodash -W
```

这样就实现了在所有组件中都可以使用 `lodash` 了。

## 总结

`monorepo + pnpm + vue3 + TypeScript` 写起项目来还是很舒服的，本篇只是简单的介绍了一下 `monorepo` 的一些基本的思想和搭建方式。

## 联系我

你可以通过下面方式联系到我：

- 微信：`VirgoTyh`
- [Github](https://github.com/Tyh2001)
- [官网首页](https://tianyuhao.cn)
- [vue3-pnpm-monorepo](https://github.com/Tyh2001/vue3-pnpm-monorepo)

## 你需要注意

该仓库可能会不定时更新迭代，部分配置会与文章内容不符，可通过 [历史版本](https://github.com/Tyh2001/vue3-pnpm-monorepo/commits/master) 查看迭代过程。
