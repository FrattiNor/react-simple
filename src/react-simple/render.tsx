import {
    customWindow,
    Element,
    Fiber,
    FiberRoot,
    Props,
} from "./types"

// 根Fiber
let wipRoot: null | FiberRoot = null
// 提交给DOM的最后一棵Fiber树 用于比较
let currentRoot: null | FiberRoot = null
// next任务单元，render内赋予第一个nextUnitOfWork
let nextUnitOfWork: null | Fiber | FiberRoot = null
// 需要删除的fiber
let deletions: Fiber[] = []
//
let wipFiber: null | Fiber = null
//
let hookIndex: number = 0

// 根据Fiber创建dom
const createDom = (fiber: Fiber) => {
    // 创建元素
    const dom =
        fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type as string)
    // 设置元素参数
    Object.keys(fiber.props)
        .filter((key: string) => key !== "children")
        .forEach((name) => {
            dom[name as "nodeValue"] = fiber.props[name]
        })

    return dom
}

const isEvent = (key: string) => key.startsWith("on")
const isProperty = (key: string) => key !== "children" && !isEvent(key)
const isNew = (prev: Props, next: Props) => (key: string) =>
    prev[key] !== next[key]
const isGone = (prev: Props, next: Props) => (key: string) =>
    !(key in next)

function updateDom(
    dom: HTMLElement | Text,
    prevProps: Props,
    nextProps: Props
) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            (key) => !(key in nextProps) || isNew(prevProps, nextProps)(key)
        )
        .forEach((name) => {
            const eventType = name.toLowerCase().substring(2)
            dom.removeEventListener(eventType, prevProps[name])
        })
    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
            const eventType = name.toLowerCase().substring(2)
            dom.addEventListener(eventType, nextProps[name])
        })
    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach((name) => {
            dom[name as "nodeValue"] = ""
        })
    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach((name) => {
            dom[name as "nodeValue"] = nextProps[name]
        })
}

function commitDeletion(fiber: Fiber, domParent: HTMLElement | Text) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else if (fiber.child) {
        commitDeletion(fiber.child, domParent)
    }
}

// 具体的提交工作
const commitWork = (fiber: Fiber | null) => {
    if (!fiber) {
        return
    }
    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom
    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        const alternateProps = fiber.alternate ? fiber.alternate.props : {}
        updateDom(fiber.dom, alternateProps, fiber.props)
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
    }
    commitWork(fiber.child || null)
    commitWork(fiber.sibling || null)
}
// 提交根Fiber
const commitRoot = () => {
    if (wipRoot !== null) {
        deletions.forEach(commitWork)
        commitWork(wipRoot.child || null)
        currentRoot = wipRoot
        wipRoot = null
    }
}

// render
const render = (element: Element, container: HTMLElement) => {
    console.log('element', element)
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    deletions = []
    nextUnitOfWork = wipRoot

    // 我们requestIdleCallback用来做一个循环。您可以将其requestIdleCallback视为setTimeout，但浏览器将在主线程空闲时运行回调，而不是告诉我们何时运行。
    // React不再使用requestIdleCallback了。现在，它使用调度程序包。但是对于此用例，它在概念上是相同的。
    // 在浏览器空闲的时候调用
    ;(window as customWindow).requestIdleCallback(workLoop)
}

// 获取childs的fiber
const reconcileChildren = (
    parentFiber: Fiber,
    childs: Element[]
) => {
    console.log('a',parentFiber, childs)
    let index = 0
    let oldFiber = parentFiber.alternate && parentFiber.alternate.child
    let prevSibling: Fiber | null = null
    while (index < childs.length || oldFiber != null) {
        const element = childs[index]
        let newFiber = null
        const sameType = oldFiber && element && element.type == oldFiber.type
        if (sameType) {
            newFiber = {
                type: oldFiber ? oldFiber.type : "",
                props: element.props,
                dom: oldFiber ? oldFiber.dom : null,
                parent: parentFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: parentFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }
        if (index === 0) {
            parentFiber.child = newFiber as Fiber
        } else if (prevSibling !== null) {
            prevSibling.sibling = newFiber as Fiber
        }
        prevSibling = newFiber as Fiber
        index++
    }
}

function updateFunctionComponent(fiber: Fiber) {
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [(fiber.type as Function)(fiber.props)]
    reconcileChildren(fiber, children)
}

function updateHostComponent(fiber: Fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
}

// 创建新的fiber，获得next工作单元（fiber）
const performUnitOfWork = (outFiber: Fiber | FiberRoot) => {
    const fiber = outFiber as Fiber
    const isFunctionComponent = fiber.type instanceof Function
    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
    return null
}

// 浏览器空闲时执行构建 fiber tree
function workLoop(deadline: any) {
    let shouldYield = false
    // 执行直到 deadline
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
    }
    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }
    // 继续监听下一个空闲时间
    ;(window as customWindow).requestIdleCallback(workLoop)
}

function useState(initial: any) {
    const oldHook =
        wipFiber &&
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex]
    const hook = {
        state: oldHook ? oldHook.state : initial,
        ["queue" as string]: [],
    }
    const actions = oldHook ? oldHook.queue : []
    actions.forEach((action: Function) => {
        hook.state = action(hook.state)
    })
    const setState = (action: Function) => {
        hook.queue.push(action)
        if (currentRoot) {
            wipRoot = {
                dom: currentRoot.dom,
                props: currentRoot.props,
                alternate: currentRoot,
            }
            nextUnitOfWork = wipRoot
        }
        deletions = []
    }
    wipFiber && wipFiber.hooks && wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}

export default render
export { useState }
