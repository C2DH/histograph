
export function forwardEventHandler(scope, handlerName) {
  return (...args) => {
    if (!scope[handlerName]) return
    scope.$apply(() => scope[handlerName](...args))
  }
}
