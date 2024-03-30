<div align="center">

# ⭐ secure-vm

> 🧪 一个实验性的基于 iframe 的前端代码沙箱 (用于 electron, 微应用等)。

[![CodeFactor](https://www.codefactor.io/repository/github/furryr/secure-vm/badge)](https://www.codefactor.io/repository/github/furryr/secure-vm)
[![Visitors](https://hits.dwyl.com/FurryR/secure-vm.svg?style=flat-square)](http://github.com/FurryR/secure-vm)
[![🛠️ Build](https://github.com/FurryR/secure-vm/actions/workflows/ci.yaml/badge.svg)](https://github.com/FurryR/secure-vm/actions/workflows/ci.yaml)

[🇺🇸](./README.md) | [🇨🇳](./README-zh_CN.md)

</div>

## ❓ 它的用处？

<div align="center">

### _👻 它可以..._

</div>

- [x] 🔐 在隔离环境中运行 **不受信任的** JavaScript 代码。
- [x] 👽 传递 **外部 API** (对象，函数，类) 来让沙箱内的 JavaScript 代码使用它们。
- [ ] ⏱️ 运行时长和内存限制。见 [停机问题](https://brilliant.org/wiki/halting-problem)。
- [x] ⚛️ 支持 **electron render**。请看 [来自 electron 的 issue](https://github.com/electron/electron/issues/25888)。
- [x] 🪟 (几乎) 完全透明。（如果你不想要保护，）你甚至可以将 `vm()` 换成 `window`！
- [x] 🤔 消去 traceback 和代码，从而保护它们不受脚本小子和 DevTools 威胁。DevTools 将无法窥探代码，同时也无法使用 `debugger`。
- [ ] 🧑‍💻 ESM 支持 (你可以用 `babel` 来实现同等的效果)。

## 📃 新手起步

### 🔽 安装

#### 🦊 npm, yarn & pnpm 等

```bash
npm install secure-vm
yarn add secure-vm
pnpm install seucre-vm
```

#### 👾 IIFE (不推荐)

```html
<script src="https://cdn.jsdelivr.net/npm/secure-vm@latest/dist/index.global.js"></script>
<script>
  const ctx = SecureVM.vm()
</script>
```

### ✅ 使用方法

```js
import { vm } from 'secure-vm'

const ctx = vm() // 创建一个隔离的上下文
ctx.console = globalThis.console
ctx.eval(`
console.log("Hello secure-vm")
`)
```

## 🐺 兼容性

☣️ 这是一个**实验性的库**，它可能和一些旧的浏览器内核不兼容。但是，它可以在最新版本的 **Chromium**、**Firefox**、**Edge** 和 **Safari** 上运行。

💫 你可以自己试试: (Demo 还没出)

## 🛠️ 特点

<table>
<tr><td>

### 🔰 简单

✅ 要创建一个基本的隔离环境，你只需要用一个叫做 `vm` 的函数就可以了。

```js
const ctx = vm()
```

👽 你可以传递几乎所有东西到你的沙箱内，它们都会正常运行，比如 `Promise`（一部分函数，比如 `ArrayBuffer`，因为未知原因无法正常使用）。

```js
const ctx = vm({ console })
let callback
ctx.test = new Promise(resolve => {
  callback = resolve
})
ctx.eval(`
test.then(value => {
  console.log(value)
})
`)
callback('Hello World!')
```

<img width=2000 />

</td></tr>
<tr><td>

### 🔒 安全性

🥰 随便传什么东西都可以，`Function` (`constructor`) 是不会泄漏的。

secure-vm 还修复了几乎所有 [evel](https://github.com/natevw/evel) 有的漏洞，比如 [Object.prototype](https://github.com/natevw/evel/issues/27) 绕过无效。

```js
ctx.fetch = fetch
ctx.console = console
fetch('some furry pics')
  .then(
    ctx.eval(`
req => {
  console.log(req)
  return req.text()
}
`)
  )
  .then(v => {
    console.log(v)
  })
```

🤖 我们不支持动态 `import()`，所以你无需担心动态 `import` 绕过。请参照 [来自 evel 的 issue](https://github.com/natevw/evel/issues/28)。

或许我们可以通过 `babel` 来实现 `import`，但我们不关心这个。

```js
import('data:text/javascript,console.log(window)')
// TypeError: Cannot import module from an inactive browsing context. (Chromium)
// TypeError: error loading dynamically imported module: data:text/javascript,console.log(window) (Firefox)
```

</td></tr>
<tr><td>

### 🤔 混淆

🔏 secure-vm 将自动消去 traceback 中的代码行数信息，脚本小子们将无法访问源代码。这样可以让你的项目更加难以破解。

```js
ctx.eval(`
function throwError() {
  throw new Error('Where is it?')
}
throwError() // throwError() will not be displayed in the DevTools traceback (Edge, Chromium, Firefox).
`)
```

</td></tr>
<tr><td>

### 🎨 客制化

😎 你可以通过以下方式自定义全局对象：

```js
const ctx = vm({ WebAssembly })
ctx. // type hint: WebAssembly
```

...或使用我们的默认白名单：

```js
const ctx = vm()
```

</td></tr>
</table>

---

<div align="center">

_`此项目以 MIT 协议发行。`_

❤️

</div>
