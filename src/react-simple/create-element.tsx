import { createElementFun, createTextElementFun } from "./types"

// createTextElement
const createTextElement: createTextElementFun = (text) => ({
    type: "TEXT_ELEMENT",
    props: {
        nodeValue: text,
        children: [],
    },
})

// createElement AST抽象语法树
const createElement: createElementFun = (type, props, ...children) => ({
    type,
    props: {
        ...props,
        children: children.map((child) =>
            typeof child === "object" ? child : createTextElement(child)
        ),
    },
})

export default createElement
