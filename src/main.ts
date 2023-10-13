type ScopeHelper<T extends readonly (string | symbol)[]> = {
  [key in T[number]]: unknown
}
const whitelist = [
  'Array',
  'Boolean',
  'Date',
  'Error',
  'EvalError',
  'Function',
  'Infinity',
  'JSON',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Reflect',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'String',
  'SyntaxError',
  'TypeError',
  'URIError',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'undefined',
  'location',
  'unescape'
] as const
type ContextScope = ScopeHelper<typeof whitelist> & {
  eval: typeof eval
  Function: typeof Function
  TypeError: typeof TypeError
} & {
  [key: string | symbol]: unknown
}
/**
 * 虚拟机上下文。
 */
export class Context {
  private context: ContextScope
  /**
   * 在上下文中执行代码。
   * @param code 代码。
   * @returns 代码的结果。
   */
  eval(code: string) {
    return this.context.eval(code)
  }
  /**
   * 创建上下文。
   * @param ctx 在全局中的额外属性。将会使用 Proxy 确保安全。
   */
  constructor(ctx: { [key: string | symbol]: object } = {}) {
    const proxify = (context: ContextScope, obj: object): object => {
      const ensure_safe = (res: unknown): unknown => {
        if (
          res != null &&
          (typeof res === 'object' || typeof res === 'function')
        ) {
          return proxify(context, res)
        }
        return res
      }
      return new Proxy(obj, {
        get(
          target: object,
          property: string | symbol,
          receiver: unknown
        ): unknown {
          try {
            const res = Reflect.get(target, property, receiver)
            if (typeof target === 'function' && property === 'prototype') {
              context.eval(`throw new TypeError(
              'Accessing prototype by constructor is not supported. Use Object.getPrototypeOf() or Reflect.getPrototypeOf() instead'
            )`)
            }
            if (res === Function) {
              return context.Function
            }
            return ensure_safe(res)
          } catch (e) {
            throw ensure_safe(e)
          }
        },
        set(
          target: object,
          property: string | symbol,
          newValue: unknown,
          receiver: unknown
        ): boolean {
          try {
            return Reflect.set(target, property, newValue, receiver)
          } catch (e) {
            throw ensure_safe(e)
          }
        },
        apply(target: object, thisArg: unknown, argArray: unknown[]): unknown {
          try {
            return ensure_safe(
              Reflect.apply(
                target as (this: unknown, ...args: unknown[]) => unknown,
                thisArg,
                argArray
              )
            )
          } catch (e) {
            return ensure_safe(e)
          }
        },
        construct(
          target: object,
          argArray: unknown[],
          newTarget: Function
        ): object {
          try {
            return proxify(
              context,
              Reflect.construct(
                target as new (...args: unknown[]) => object,
                argArray,
                newTarget
              )
            )
          } catch (e) {
            throw ensure_safe(e)
          }
        },
        getPrototypeOf(target: object): object | null {
          const res = Reflect.getPrototypeOf(target)
          if (res === null) return res
          const temp = {}
          Reflect.ownKeys(res).forEach(key =>
            Reflect.set(temp, key, Reflect.get(res, key))
          )
          return proxify(context, temp)
        },
        isExtensible(): boolean {
          return true
        },
        preventExtensions(): boolean {
          return false
        },
        setPrototypeOf(): boolean {
          return false
        }
      })
    }
    const createContext = (
      whitelist: readonly (string | symbol)[]
    ): ContextScope => {
      const elem = document.createElement('iframe')
      elem.src = 'about:blank'
      elem.style.display = 'none'
      document.head.appendChild(elem)
      const win = elem.contentWindow as unknown as ContextScope
      document.head.removeChild(elem)
      if (!win) throw new Error('Could not create context')
      for (const key of Reflect.ownKeys(win)) {
        if (!whitelist.includes(key)) {
          try {
            if (Object.is(Reflect.get(win, key), win)) continue
          } catch (_) {} // Firefox 118: Reflect.get(win, 'screen') -> NS_ERROR_UNEXPECTED internal error
          if (!Reflect.deleteProperty(win, key)) {
            try {
              Reflect.set(win, key, undefined)
              if (Reflect.get(win, key) != undefined) throw new Error()
            } catch (_) {
              const val = Reflect.get(win, key)
              if (typeof val === 'object' && val !== null) {
                if (!Reflect.setPrototypeOf(val, null)) {
                  console.warn('Cannot delete property', key)
                }
                Reflect.preventExtensions(val)
              } else {
                console.warn('Cannot delete property', key)
              }
            }
          }
        }
      }
      return win
    }
    this.context = createContext(whitelist)
    for (const [key, value] of Object.entries(ctx)) {
      Reflect.set(this.context, key, proxify(this.context, value))
    }
  }
}
