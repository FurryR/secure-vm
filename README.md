<div align="center">

# ⭐ secure-vm

> 🧪 Experimental `vm()` based on iframe for frontend (electron, micro apps, etc).

</div>

## ❓ What can it do?

<div align="center">

### _👻 It can..._

</div>

- [x] 🔐 Run **untrusted** JavaScript code in an isolated environment.
- [x] 👽 Pass **external APIs** (Objects, Functions, Classes) and let untrusted JavaScript code to use them.
- [ ] ⏱️ Timeout and memory usage limits. See [halting problem](https://brilliant.org/wiki/halting-problem).
- [x] ⚛️ Available in **electron render**. See [issue from electron](https://github.com/electron/electron/issues/25888).
- [x] 🪟 (Almost) Fully transparent. You can even replace `vm()` with `window` (if you don't want protection)!
- [x] 🤔 Keep traceback & code from hackers / DevTools. DevTools will be unable to inspect your code or use `debugger`.
- [ ] 🧑‍💻 ESM support (You can use `babel` to implement that though).

## 📃 Getting Started

### 🔽 Install

#### 🦊 npm, yarn & pnpm, etc.

```bash
npm install secure-vm
yarn add secure-vm
pnpm install seucre-vm
```

#### 👾 IIFE (not recommended)

```html
<script src="index.global.js"></script>
<script>
  const ctx = SecureVM.vm()
</script>
```

### ✅ Usage

```js
import { vm } from 'secure-vm'

const ctx = vm() // Create an isolated context.
ctx.console = globalThis.console
ctx.eval(`
console.log("Hello secure-vm")
`)
```

## 🐺 Compatibility

☣️ This is an **experimental library** that may be incompatible with some old browser kernels (for example, **Opera**). However, it works on latest versions of **Chromium**, **Firefox**, **Edge** and **Safari**.

💫 Try it out by yourself: (Demo not ready)

## 🛠️ Features

<table>
<tr><td>

### 🔰 Ease to use

✅ To create a simple isolation, you only have to use a simple function, `vm`.

```js
const ctx = vm()
```

👽 You can bypass almost everything to your sandbox and it will work properly, for example, `Promise`. (Some functions like `ArrayBuffer` may not work properly for unknown reasons)

```js
const ctx = vm()
ctx.console = console
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

### 🔒 Security

🥰 Feel free to add anything you want, `Function` (`constructor`) is gonna be safe.

secure-vm also fixed almost all security issues on [evel](https://github.com/natevw/evel), for example, [Object.prototype](https://github.com/natevw/evel/issues/27) bypass will fail.

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

🤖 Dynamic `import()` is disabled, so you do not need to worry about `import` bypass. See [issue from evel](https://github.com/natevw/evel/issues/28).

Maybe we can run these code by using `babel` hacks, but we don't care.

```js
import('data:text/javascript,console.log(window)')
// TypeError: Cannot import module from an inactive browsing context. (Chromium)
// TypeError: error loading dynamically imported module: data:text/javascript,console.log(window) (Firefox)
```

</td></tr>
<tr><td>

### 🤔 Obfuscation

🔏 secure-vm will automatically erase the traceback line info (if available) so hackers cannot access source code, making it harder to deobfuscate.

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

### 🎨 Customization

😎 You can customize global objects by:

```js
const ctx = vm(iframe(['Array']))
ctx. // type hint: Array Function
```

...or use our default whitelist by:

```js
const ctx = vm()
```

</td></tr>
</table>

---

<div align="center">

_`This project is licensed under the MIT license.`_

❤️

</div>
