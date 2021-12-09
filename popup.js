const sourceTypeLocalTrans = { link: "Link", img: "Image", script: "Script", iframe: 'Inline Frame' }
const sourceTypeDirectiveTrans = { link: "connect", img: "img", script: "script", iframe: 'frame' }

let tabOrigin = ''

function toResourceList(resourceList) {
    const resourceListEl = document.getElementById('resourceList')

    Object.keys(resourceList).forEach(type => {
        const resourceCount = Object.keys(resourceList[type]).length
        const typeItem = document.createElement('li')
        typeItem.innerHTML = `<h3>${sourceTypeLocalTrans[type]} Sources (${resourceCount})</h3>`
        resourceListEl.appendChild(typeItem)

        if (!resourceCount) return

        Object.keys(resourceList[type]).forEach(origin => {
            const originItem = document.createElement('li')
            originItem.innerHTML = (origin === tabOrigin) ? `${origin} ('self')` : origin
            originItem.classList.add('item')
            resourceListEl.appendChild(originItem)
        })
    })
}

function toCspHeaderString(resourceList) {
    const cspHeaderInputEl = document.getElementById('cspHeaderInput')
    let headerString = "Content-Security-Policy: default-src 'self'; "

    Object.keys(resourceList).forEach(type => {
        if (!Object.keys(resourceList[type]).length) return

        headerString += `${sourceTypeDirectiveTrans[type]}-src `

        Object.keys(resourceList[type]).forEach((origin, key, arr) => {
            headerString += (origin === tabOrigin) ? "'self'" : origin
            headerString += (Object.is(arr.length - 1, key)) ? '; ' : ' '
        })
    })

    cspHeaderInputEl.value = headerString
    cspHeaderInputEl.style.height = `${cspHeaderInputEl.scrollHeight + 3}px`
}

function getResourcesTypeDomains() {
    let resourceList = { link: {}, img: {}, script: {}, iframe: {} }
    window.performance.getEntries().forEach(entry => {
        if (entry.initiatorType in resourceList) {
            resourceList[entry.initiatorType][(new URL(entry.name)).origin] = true
        }
    })
    return resourceList
}

[...document.getElementsByClassName('copy-previous')].forEach(el => {
    const copyText = 'Copy'
    el.addEventListener('click', event => {
        navigator.clipboard.writeText(event.target.previousElementSibling.value)
        event.target.innerText = 'Copied!'
        event.target.disabled = true
        setTimeout(() => {
            event.target.innerText = copyText
            event.target.disabled = false
        }, 2000)
    })
    el.type = 'button'
    el.innerText = copyText
})

chrome.tabs.query({ active: true, currentWindow: true }).then(results => {
    tabOrigin = (new URL(results[0].url)).origin

    chrome.scripting.executeScript({
        target: { tabId: results[0].id },
        function: getResourcesTypeDomains
    }).then(injectionResults => {
        let fullResourceList = {}

        for (const frameResult of injectionResults) {
            fullResourceList = {
                ...fullResourceList,
                ...frameResult.result
            }
        }
        toResourceList(fullResourceList)
        toCspHeaderString(fullResourceList)
    })
})
