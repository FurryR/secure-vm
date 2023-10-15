# secure-vm

一个利用浏览器实现的，安全、轻量、极简、透明的沙箱环境。

```js
const ctx = vm()
ctx.console = console
ctx.eval('console.log("Hello World!")')
```

- [secure-vm](#secure-vm)
  - [兼容性](#兼容性)
  - [使用方法](#使用方法)
    - [创建](#创建)
    - [外部访问](#外部访问)
  - [缓存](#缓存)
  - [原理](#原理)

## 兼容性

| 特性     | Chrome | Edge | Firefox | Safari | Opera |
| -------- | ------ | ---- | ------- | ------ | ----- |
| 沙箱支持 | 84     | 84   | 79      | 14.1   | ❌    |

## 使用方法

### 创建

要创建一个上下文，方式如下：

```js
const ctx = vm() // 返回一个 globalThis 对象
```

然后，你可以使用 `ctx.eval` 或者 `ctx.Function` 执行代码：

```js
ctx.eval('1 + 1')
```

整个框架就这么多内容。

### 外部访问

你可以通过 `ctx` 向沙盒本身添加或移除一些全局属性，secure-vm 会帮助你进行相应的隔离。

甚至，即使使用 `ctx.Function = Function`，也不会导致沙盒逃逸。

**警告：secure-vm 并不能保证外部内容不被滥用。如果你的函数含有 eval 或者 Function 等内容，即使 secure-vm 也无能为力。**

```js
function A() {
  this.method = function () {
    return new Function("return 'Hello World'")
  }
  this.set_value = function (value) {
    this.value = value
  }
  this.value = new Object()
}
const instance = new A()
const ctx = vm()
ctx.instance = instance
ctx.eval(`
const instance2 = new instance.constructor(); // OK，将创建一个新的，受隔离的 instance。
instance.method()(); // OK，将返回 Hello World。
instance2.method()(); // OK，将返回 Hello World。
instance.method().constructor('return window')(); // 逃逸失败
instance.value.constructor.constructor('return window')(); // 逃逸失败
instance2.value.constructor.constructor('return window')(); // 逃逸失败
instance.set_value(1); // 成功
instance2.set_value(1); // 成功
`)
```

## 缓存

为了确保引用比较相等且不引发错误，secure-vm 内置了缓存系统，将尽量减少 Proxy 的创建。

```js
const ctx = vm()
const a = {
  array1: ctx.Array,
  array2: ctx.Array
}
console.log(a.array1 === a.array2) // true
delete a.array1
delete a.array2
// 此处，Proxy 对象被回收
```

## 原理

iframe 在被加入 DOM 树时，会生成一个 Window 对象放置于 iframe.contentWindow。

当 iframe 被从 DOM 树删除时，iframe.contentWindow 将变为 null。

而如果在删除之前先使用变量引用 contentWindow，再去删除 iframe，则会得到一个资源都被释放，但各种基础函数仍可用的 iframe。

这将成为一个绝佳的沙盒环境。secure-vm 在其上配合 Proxy，实现了前端安全沙盒。
