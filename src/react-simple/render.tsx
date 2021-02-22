import { anyObject } from "./types"

type customWindow = Window & typeof globalThis & { requestIdleCallback: any }
type Props = {
    [key: string]: any
}
type ElementTree = {
    type: string
    props: {
        children: ElementTree[]
    } & Props
}
type Dom = HTMLElement | Text
type Fiber = {
    type: string | Function | null
    dom: Dom | null
    child: Fiber | null
    nextBrother: Fiber | null
    parent: Fiber | null
    hooks?: any[]
    prevFiber: null | Fiber
    operationType: "update" | "delete" | "add" | null
    props: {
        children: ElementTree[]
    } & Props
}

const isEvent = (key: string) => key.startsWith("on")
const isProps = (key: string) => key !== "children" && !isEvent(key)
const isNew = (prev: Props, next: Props) => (key: string) =>
    prev[key] !== next[key]
const isGone = (prev: Props, next: Props) => (key: string) => !(key in next)

// 根fiber
let rootFiber: Fiber | null = null
// 上一次的rootFiber
let prevRootFiber: Fiber | null = null
// 正在执行的fiber
let currentFiber: Fiber | null = null
// 正在执行的commitFiber
let currentCommitFiber: Fiber | null = null
// 临时fiber，用于给hook获取对应组件（用于函数组件）
let temporaryFiber: Fiber | null = null
// hook id
let hookIndex: number = 0
// 需要删除的fiber
let deleteFibers: Fiber[] = []

// 根据Fiber创建dom
const createDom = (fiber: Fiber) => {
    // 创建元素
    let dom: HTMLElement | Text

    switch (fiber.type) {
        case "TEXT_ELEMENT":
            dom = document.createTextNode("")
            break
        case "FALSE_ELEMENT":
            dom = document.createTextNode("")
            break
        default:
            dom = document.createElement(fiber.type as string)
            break
    }

    // 增加新的监听器
    Object.keys(fiber.props)
        .filter(isEvent)
        .forEach((name) => {
            const eventType = name.toLowerCase().substring(2)
            dom.addEventListener(eventType, fiber.props[name])
        })

    // 设置新的属性
    Object.keys(fiber.props)
        .filter(isProps)
        .forEach((name) => {
            dom[name as "nodeValue"] = fiber.props[name]
        })

    return dom
}

// 处理fiber获取child
const handleFiberGetChild = (parentFiber: Fiber, childrens: ElementTree[]) => {
    let len = childrens.length
    let index = 0
    let prevChild: Fiber | null = null
    let childPrevFiber = parentFiber.prevFiber
        ? parentFiber.prevFiber.child
        : null
    while (index < len) {
        let childElement = childrens[index]
        let newFiber: null | Fiber = null
        const sameType =
            childPrevFiber &&
            childElement &&
            childElement.type == childPrevFiber.type
        if (childElement && sameType && childPrevFiber) {
            newFiber = {
                type: childPrevFiber.type,
                props: childElement.props,
                parent: parentFiber,
                dom: childPrevFiber.dom,
                child: null,
                nextBrother: null,
                prevFiber: childPrevFiber,
                operationType: "update",
            }
        }
        if (childElement && !sameType) {
            newFiber = {
                type: childElement.type,
                props: childElement.props,
                parent: parentFiber,
                dom: null,
                child: null,
                nextBrother: null,
                prevFiber: null,
                operationType: "add",
            }
        }
        if (childPrevFiber && !sameType) {
            childPrevFiber.operationType = "delete"
            deleteFibers.push(childPrevFiber)
        }
        if (childPrevFiber) {
            childPrevFiber = childPrevFiber.nextBrother
        }
        if (index === 0) {
            parentFiber.child = newFiber
        } else if (prevChild !== null) {
            prevChild.nextBrother = newFiber
        }
        prevChild = newFiber
        index++
    }
}

// 处理函数组件
const handleFunctionComponent = (fiber: Fiber) => {
    hookIndex = 0
    fiber.hooks = []
    temporaryFiber = fiber
    const children = [(fiber.type as Function)(fiber.props)]
    handleFiberGetChild(fiber, children)
}

// 处理html原生组件
const handleHostComponent = (fiber: Fiber) => {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    handleFiberGetChild(fiber, fiber.props.children)
}

// 返回的下一个fiber
const returnNextFiber = (fiber: Fiber) => {
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber: Fiber | null = fiber
    while (nextFiber) {
        if (nextFiber.nextBrother) {
            return nextFiber.nextBrother
        }
        nextFiber = nextFiber.parent
    }

    return null
}

// 根据传入的fiber获取新的fiber
const getNextFiber = (fiber: Fiber) => {
    // 是否是函数组件
    const isFunctionComponent = fiber.type instanceof Function

    if (isFunctionComponent) {
        handleFunctionComponent(fiber)
    } else {
        handleHostComponent(fiber)
    }

    return returnNextFiber(fiber)
}

const handleUpdate = (fiber: Fiber) => {
    const dom = fiber.dom
    const prevProps: anyObject = fiber.prevFiber?.props || {}
    const nextProps = fiber.props
    if (dom) {
        // 移除旧的监听器
        Object.keys(prevProps)
            .filter(isEvent)
            .filter(
                (key) => !(key in nextProps) || isNew(prevProps, nextProps)(key)
            )
            .forEach((name) => {
                const eventType = name.toLowerCase().substring(2)
                dom.removeEventListener(eventType, prevProps[name])
            })
        // 增加新的监听器
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isNew(prevProps, nextProps))
            .forEach((name) => {
                const eventType = name.toLowerCase().substring(2)
                dom.addEventListener(eventType, nextProps[name])
            })
        // 移除旧的属性
        Object.keys(prevProps)
            .filter(isProps)
            .filter(isGone(prevProps, nextProps))
            .forEach((name) => {
                dom[name as "nodeValue"] = ""
            })
        // 设置新的属性
        Object.keys(nextProps)
            .filter(isProps)
            .filter(isNew(prevProps, nextProps))
            .forEach((name) => {
                dom[name as "nodeValue"] = nextProps[name]
            })
    }
}

const handleDelete = (fiber: Fiber, parentDom: HTMLElement | Text) => {
    if (fiber.dom) {
        parentDom.removeChild(fiber.dom)
    } else if (fiber.child) {
        handleDelete(fiber.child, parentDom)
    }
}

const handleAdd = (fiber: Fiber, parentDom: HTMLElement | Text) => {
    if (fiber.dom !== null) {
        parentDom.appendChild(fiber.dom)
    }
}

const handleFiber = (fiber: Fiber) => {
    let parentFiber = fiber.parent
    while (parentFiber !== null && parentFiber.dom === null) {
        parentFiber = parentFiber.parent
    }
    if (parentFiber !== null && parentFiber.dom !== null) {
        switch (fiber.operationType) {
            case "add":
                handleAdd(fiber, parentFiber.dom)
                break
            case "update":
                handleUpdate(fiber)
                break
            case "delete":
                handleDelete(fiber, parentFiber.dom)
                break
            default:
                break
        }
    }
}

const getNextDeleteFibers = (fibers: Fiber[]) => {
    if (fibers.length > 0) {
        const theFiber = fibers.shift()
        handleFiber(theFiber as Fiber)
    }
    return fibers
}

// 提交任务，把dom循环挂载到father上
const getNextCommitFiber = (fiber: Fiber) => {
    handleFiber(fiber)
    return returnNextFiber(fiber)
}

// 任务循环，循环处理fiber
const workLoop = (deadline: any) => {
    let shouldStop = deadline.timeRemaining() < 1
    // 如果有执行fiber，则执行当前fiber获取child等，返回下一个fiber
    while (currentFiber !== null && !shouldStop) {
        currentFiber = getNextFiber(currentFiber)
        shouldStop = deadline.timeRemaining() < 1
    }
    // 如果没有执行fiber，并且存在根fiber，全部fiber已经处理完毕，把处理好的根fiber传递给 执行commitFiber
    if (currentFiber === null && rootFiber !== null) {
        currentCommitFiber = rootFiber
        prevRootFiber = rootFiber
        rootFiber = null
        shouldStop = deadline.timeRemaining() < 1
    }
    // 如果有执行 commit fiber,则执行 提交
    while (currentCommitFiber !== null && !shouldStop) {
        if (deleteFibers.length > 0) {
            deleteFibers = getNextDeleteFibers(deleteFibers)
        } else {
            currentCommitFiber = getNextCommitFiber(currentCommitFiber)
        }
        shouldStop = deadline.timeRemaining() < 1
    }

    if (
        shouldStop ||
        (currentFiber === null &&
            rootFiber === null &&
            currentCommitFiber === null)
    ) {
        // 继续监听下一个空闲时间
        ;(window as customWindow).requestIdleCallback(workLoop)
    }
}

// 初始化
const initStart = (newFiber: Fiber) => {
    // 设置根fiber
    rootFiber = newFiber
    // 清空删除的fiber
    deleteFibers = []
    // 将根fiber设置为执行fiber
    currentFiber = rootFiber
}

// render函数
const render = (elementTree: ElementTree, container: HTMLElement) => {
    initStart({
        type: null,
        dom: container,
        child: null,
        nextBrother: null,
        parent: null,
        prevFiber: prevRootFiber,
        operationType: null,
        props: {
            children: [elementTree],
        },
    })
    // 开始监听
    ;(window as customWindow).requestIdleCallback(workLoop)
}

const useState = (initialValue: any) => {
    const oldHook =
        temporaryFiber &&
        temporaryFiber.prevFiber &&
        temporaryFiber.prevFiber.hooks &&
        temporaryFiber.prevFiber.hooks[hookIndex]
    const actions = oldHook ? oldHook.queue : []
    const hook = {
        state: oldHook ? oldHook.state : initialValue,
        ["queue" as string]: [],
    }
    actions.forEach((action: Function) => {
        hook.state = action(hook.state)
    })
    const setState = (action: Function) => {
        hook.queue.push(action)
        if (prevRootFiber) {
            initStart({
                dom: prevRootFiber.dom,
                props: prevRootFiber.props,
                prevFiber: prevRootFiber,
                type: null,
                child: null,
                nextBrother: null,
                parent: null,
                operationType: null,
            })
        }
    }
    temporaryFiber && temporaryFiber.hooks && temporaryFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}

export default render
export { useState }
