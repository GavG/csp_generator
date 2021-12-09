const sourceTypeTrans = { link: "Link", img: "Image", script: "Script" }

let tabOrigin = ''

function toResourceList(resourceList) {
    const resourceListEl = document.getElementById('resourceList')

    Object.keys(resourceList).forEach(type => {
        const typeItem = document.createElement('li')
        typeItem.innerHTML = `<h2>${sourceTypeTrans[type]} Sources</h2>`
        resourceListEl.appendChild(typeItem)

        Object.keys(resourceList[type]).forEach(origin => {
            const originItem = document.createElement('li')
            originItem.innerHTML = (origin === tabOrigin) ? `${origin} ('self')` : origin
            resourceListEl.appendChild(originItem)
        })
    })
}

function toCspHeaderString(resourceList) {
    const cspHeaderInputEl = document.getElementById('cspHeaderInput')
    let headerString = 'Content-Security-Policy: '

    Object.keys(resourceList).forEach(type => {
        headerString += `${type}-src `

        Object.keys(resourceList[type]).forEach((origin, key, arr) => {
            headerString += (origin === tabOrigin) ? "'self'" : origin
            headerString += (Object.is(arr.length - 1, key)) ? ';' : ' '
        })
    })

    cspHeaderInputEl.value = headerString
    cspHeaderInputEl.style.height = `${cspHeaderInputEl.scrollHeight + 3}px`
}

function getResourcesTypeDomains() {
    let resourceList = { link: {}, img: {}, script: {} }
    window.performance.getEntries().forEach(entry => {
        if (entry.initiatorType in resourceList) {
            resourceList[entry.initiatorType][(new URL(entry.name)).origin] = true
        }
    })
    return resourceList
}

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
