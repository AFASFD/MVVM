let id = 0
let currentObserver = null
class MVVM {
    constructor(opts) {
        this.init(opts)
        observe(this.$data)
        new Compile(this)
    }
    init(opts) {
        this.$el = document.querySelector(opts.el)
        this.$data = opts.data
    }
}
//把对象上的每个属性用Object.defineProperty方法变成getter/setter的形式
//给每个属性都生成一个发布者实例
function observe(data) {
    if (!data || !(data instanceof Object)) {
        console.log(1)
        return
    }
    for (let key in data) {
        let val = data[key] //这里不能用var声明,因为这个变量要让每个订阅者都自己独有
        let subject = new Subject()
        Object.defineProperty(data, key, {
            enumerable: true, //该属性可枚举属性
            configurable: true, //改属性可删除
            get: function () {
                if (currentObserver) {
                    currentObserver.subscribeTo(subject)
                }
                return val
            },
            set: function (newVal) {
                val = newVal
                subject.notify()
            }
        })
        if (val instanceof Object) {
            observe(val)
        }
    }
}
//订阅者
class Observer {
    constructor(vm, key, cb) {
        this.subject = {}
        this.vm = vm
        this.key = key
        this.cb = cb
        this.value = this.getValue()
    }
    //获取最新数据
    getValue() {
        currentObserver = this
        let value = this.vm.$data[this.key]
        currentObserver = null
        return value
    }
    //更新数据
    update() {
        let oldValue = this.value
        let value = this.getValue()
        if (value !== oldValue) {
            this.value = value
            this.cb.bind(this.vm)(value, oldValue)
        }
    }
    //订阅发布者
    subscribeTo(subject) {
        if (!this.subject[subject.id]) {
            subject.addObserver(this)
            this.subject[subject.id] = subject
        }
    }
}
//发布者
class Subject {
    constructor() {
        this.id = id++
            this.observers = []
    }
    //添加订阅者
    addObserver(observer) {
        this.observers.push(observer)
    }
    //移除订阅者
    removeObserver(observer) {
        let index = this.observers.indexOf(observer)
        if (index > -1) {
            this.observers.splice(index, 1)
        }
    }
    //给所有订阅者发通知
    notify() {
        this.observers.forEach(observer => {
            observer.update()
        })
    }
}
//渲染页面
class Compile {
    constructor(vm) {
        this.vm = vm
        this.node = vm.$el
        this.compile()
    }
    compile() {
        this.traverse(this.node)
    }
    traverse(node) {
        if (node.nodeType === 1) {
            this.compileNode(node)
            node.childNodes.forEach(childNode => {
                this.traverse(childNode)
            })
        } else if (node.nodeType === 3) {
            this.compileText(node)
        }
    }
    //模板替换
    compileText(node) {
        let reg = /{{(.+?)}}/g
        let match
        while (match = reg.exec(node.nodeValue)) {
            let raw = match[0]
            let key = match[1]
            node.nodeValue = node.nodeValue.replace(raw, this.vm.$data[key])
            new Observer(this.vm, key, function (value, oldValue) {
                node.nodeValue = node.nodeValue.replace(oldValue, value)
            })
        }
    }
    //处理模板指令
    compileNode(node) {
        let attrs = [...node.attributes]
        console.log(attrs)
        attrs.forEach(attr => {
            if (this.isDirective(attr.name)) {
                let key = attr.value
                node.value = this.vm.$data[key]
                new Observer(this.vm, key, function (newValue) {
                    node.value=newValue
                })
                node.oninput = (e) => {
                    this.vm.$data[key] = e.target.value
                }
            }
        })
    }
    isDirective(attrName) {
        return attrName === 'v-model'
    }
}