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
    const [visible, setVisible] = useState(true)

    return (
        <h2>
            <a onClick={() => setVisible((v: boolean) => !v)}>Show: </a>
            <span>{visible ? "YES " : "NO "}</span>
            {visible && <span>123</span>}
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
