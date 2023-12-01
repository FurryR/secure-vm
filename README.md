<div align="center">

# ⭐ secure-vm

> 🧪 Experimental `vm()` based on iframe for frontend (electron, micro apps, etc).

</div>

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

☣️ This is an **experimental library** that may be incompatible with some old browser kernels (for example, Opera).

💫 Try it out by yourself: (Demo not ready)

## 🛠️ Features

<table>
<tr><td>

### 🔰 Ease to use

✅ To create a simple isolation, you only have to use a simple function, `vm`.

```js
const ctx = vm()
```

<img width=2000 />

</td></tr>
<tr><td>

### 🔒 Security

🥰 Feel free to add anything you want, `Function` (`constructor`) is gonna be safe.

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
</table>

---

<div align="center">

_`This project is licensed under the MIT license.`_

❤️

</div>
