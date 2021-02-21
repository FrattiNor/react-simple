export type customWindow = Window &
    typeof globalThis & { requestIdleCallback: any }

export type anyObject = {
    [key: string]: any
}

export type Props = {
    [key: string]: any
}

export type Children = Element | string | number

export type Element = {
    type: string
    props: {
        children: Element[]
    } & Props
}

export type Fiber = {
    dom: HTMLElement | Text | null
    parent: Fiber
    child?: Fiber
    sibling?: Fiber // next兄弟Fiber
    type: string | Function
    effectTag: "PLACEMENT" | "UPDATE" | "DELETION"
    alternate: FiberRoot | null
    hooks?: any[]
    props: {
        children: Element[]
    } & Props
}

export type FiberRoot = {
    dom: HTMLElement
    child?: Fiber
    props: {
        children: Element[]
    } & Props
    alternate: FiberRoot | null
    hooks?: any[]
}

// == fun ==

export type createElementFun = (
    type: string,
    props: Props,
    ...children: Children[]
) => Element

export type createTextElementFun = (text: string | number) => Element
