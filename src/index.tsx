import React from "react"
import ReactSimple, { useState, createElement } from "react-simple"
import "./index.css"

// babel 调用 createElement 改用为 ReactSimple下的createElement
/** @jsx createElement */

function Counter() {
    const [state, setState] = useState(1)

    return (
        <h1>
            <a onClick={() => setState((c: number) => c + 1)}>Count: </a>
            <span>{state}</span>
        </h1>
    )
}

function Counter2() {
    // const [state, setState] = useState(2)
    const state = 2
    return (
        <h2>
            <div>Count: </div>
            <div>{state}</div>
        </h2>
    )
}

const element = (
    <div>
        <Counter />
        <Counter2 />
    </div>
)
const container = document.getElementById("root")
ReactSimple.render(element, container as HTMLElement)
