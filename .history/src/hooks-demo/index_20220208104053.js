let hooks = [];
let hookIndex = 0;

function compare(d1, d2) {
    if (d1.length !== d2.length) {
        return false;
    }

    for (let i = 0; i < d1.length; i++) {
        if (d1[i] !== d2[i]) {
            return false;
        }
    }

    return true;
}

function useState(initValue) {
    let oldHook = hooks[hookIndex];
    let hook = null;

    if (oldHook) {
        hook = oldHook;
    } else {
        hook = {
            state: initValue,
            queue: [],
        };

        hooks[hookIndex] = hook;
    }

    hook.queue.forEach((func) => {
        hook.state = func(hook.state);
    });

    hook.queue = [];

    function setState(value) {
        hook.queue.push((state) => {
            return typeof value === "function" ? value(state) : value;
        });
    }

    hookIndex++;
    return [hook.state, setState];
}

function useEffect(func, depends) {
    let oldHook = hooks[hookIndex];
    let hook = null;

    if (oldHook) {
        hook = oldHook;
    } else {
        hook = {
            flag: true,
            depends: [],
        };

        hooks[hookIndex] = hook;
    }

    if (hook.flag || !compare(hook.depends, depends)) {
        func();
        hook.depends = [...depends];
        hook.flag = false;
    }

    hookIndex++;
}

function Component() {
    const [a, setA] = useState({});
    const [b, setB] = useState(0);

    useEffect(() => {
        console.log("a", a);
        console.log("b", b);
    }, [a, b]);
}

hookIndex = 0;
Component();
hookIndex = 0;
Component();
