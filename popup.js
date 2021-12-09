function toResourceList(resourceList) {
    const resourceListEl = document.getElementById('resourceList')
    const sourceTypeTrans = { link: "Link", img: "Image", script: "Script" }
    Object.keys(resourceList).forEach(type => {
        const typeItem = document.createElement('li')
        typeItem.innerHTML = `<h2>${sourceTypeTrans[type]} Sources</h2>`
        resourceListEl.appendChild(typeItem)

        Object.keys(resourceList[type]).forEach(origin => {
            const originItem = document.createElement('li')
            originItem.innerHTML = `<a href="${origin}">${origin}</a>`
            resourceListEl.appendChild(originItem)
        })
    })
}

function toCspStrings(resourceList) {
    
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
    chrome.scripting.executeScript({
        target: { tabId: results[0].id },
        function: getResourcesTypeDomains
    }).then(results => {
        toResourceList(results[0].result)
        toCspStrings(results[0].result)
    })
})
