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
    brother: Fiber | null
    parent: Fiber | null
    hooks?: any[]
    prevFiber: null | Fiber
    operationType: "update" | "delete" | "add" | null
    props: {
        children: ElementTree[]
    } & Props
}

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

// 处理fiber获取child
const handleFiberGetChild = (fiber: Fiber, childrens: ElementTree[]) => {
    let len = childrens.length
    let index = 0
    let prevChild: Fiber | null = null
    let childPrevFiber = fiber.prevFiber ? fiber.prevFiber.child : null
    while (index < len) {
        let childElement = childrens[index]
        let newFiber: null | Fiber = null
        const sameType =
            childPrevFiber &&
            childElement &&
            childElement.type == childPrevFiber.type
        if (childElement && sameType) {
            newFiber = {
                type: childPrevFiber.type,
                props: childElement.props,
                parent: fiber,
                dom: childPrevFiber.dom,
                child: null,
                brother: null,
                prevFiber: childPrevFiber,
                operationType: 'update',
            }
        }
        if(childElement && !sameType) {
            newFiber = {
                type: childElement.type,
                props: childElement.props,
                parent: fiber,
                dom: null,
                child: null,
                brother: null,
                prevFiber: null,
                operationType: 'add',
            }
        }
        if (prevChild && !sameType) {
            prevChild.operationType = "delete"
            deleteFibers.push(prevChild)
        }
        if(childPrevFiber) {
            childPrevFiber = childPrevFiber.brother
        }
        if (index === 0) {
            fiber.child = newFiber
        } else if (prevChild !== null) {
            prevChild.brother = newFiber
        }
        prevChild = newFiber
        index++
    }
}

// 更新函数组件
const updateFunctionComponent = (fiber: Fiber) => {
    hookIndex = 0
    fiber.hooks = []
    temporaryFiber = fiber
    const children = [(fiber.type as Function)(fiber.props)]
    handleFiberGetChild(fiber, children)
}

// 更新html原生组件
const updateHostComponent = (fiber: Fiber) => {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    console.log("fiber", fiber.type, "children", fiber.props.children)
    handleFiberGetChild(fiber, fiber.props.children)
}

// 返回的下一个fiber
const returnNextFiber = (fiber: Fiber) => {
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber: Fiber | null = fiber
    while (nextFiber) {
        if (nextFiber.brother) {
            return nextFiber.brother
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
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    return returnNextFiber(fiber)
}

// 提交任务，把dom循环挂载到father上
const getNextCommitFiber = (fiber: Fiber) => {
    let parentFiber = fiber.parent
    while (parentFiber !== null && parentFiber.dom === null) {
        parentFiber = parentFiber.parent
    }
    if (parentFiber !== null && parentFiber.dom !== null && fiber.dom) {
        parentFiber.dom.appendChild(fiber.dom)
    }

    return returnNextFiber(fiber)
}

// 任务循环，循环处理fiber
const workLoop = (deadline: any) => {
    let shouldStop = deadline.timeRemaining() < 1
    // 如果有执行fiber，则执行当前fiber获取child等，返回下一个fiber
    if (currentFiber !== null && !shouldStop) {
        currentFiber = getNextFiber(currentFiber)
        shouldStop = deadline.timeRemaining() < 1
    }
    // 如果没有执行fiber，并且存在根fiber，全部fiber已经处理完毕，把处理好的根fiber传递给 执行commitFiber
    if (currentFiber === null && rootFiber !== null) {
        currentCommitFiber = rootFiber.child
        prevRootFiber = rootFiber
        rootFiber = null
    }
    // 如果有执行 commit fiber,则执行 提交
    if (currentCommitFiber !== null && !shouldStop) {
        currentCommitFiber = getNextCommitFiber(currentCommitFiber)
        shouldStop = deadline.timeRemaining() < 1
    }

    // 继续监听下一个空闲时间
    ;(window as customWindow).requestIdleCallback(workLoop)
}

// render函数
const render = (elementTree: ElementTree, container: HTMLElement) => {
    // 设置根fiber
    rootFiber = {
        type: null,
        dom: container,
        child: null,
        brother: null,
        parent: null,
        prevFiber: null,
        operationType: null,
        props: {
            children: [elementTree],
        },
    }
    deleteFibers = []
    // 将根fiber设置为执行fiber
    currentFiber = rootFiber
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
            rootFiber = {
                dom: prevRootFiber.dom,
                props: prevRootFiber.props,
                type: null,
                child: null,
                brother: null,
                parent: null,
                prevFiber: prevRootFiber,
            }
            currentFiber = rootFiber
        }
        deleteFibers = []
    }
    hookIndex++
    return [hook.state, setState]
}

export default render
export { useState }
