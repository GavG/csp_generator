const sourceTypeLocalTrans = {
    link: "Link",
    img: "Image",
    script: "Script",
    iframe: 'Inline Frame'
}

const sourceTypeDirectiveTrans = {
    link: "connect",
    img: "img",
    script: "script",
    iframe: 'frame'
}

let tabOrigin = ''

// Set HTML Resource List
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

function toCommonCspString(resourceList) {
    let commonCspString = "default-src 'self';"

    Object.keys(resourceList).forEach(type => {
        if (!Object.keys(resourceList[type]).length) return

        commonCspString += ` ${sourceTypeDirectiveTrans[type]}-src `

        Object.keys(resourceList[type]).forEach((origin, key, arr) => {
            commonCspString += (origin === tabOrigin) ? "'self'" : origin
            commonCspString += (Object.is(arr.length - 1, key)) ? ';' : ' '
        })
    })

    return commonCspString
}

function setTextAreaValue(textArea, value) {
    textArea.value = value 
    textArea.style.height = `${textArea.scrollHeight + 3}px`
}

function toCspHeaderString(commonCspString) {
    setTextAreaValue(
        document.getElementById('cspHeaderInput'),
        `Content-Security-Policy: ${commonCspString}`
    )
}

function toMetaTagString(commonCspString) {
    setTextAreaValue(
        document.getElementById('cspMetaTagInput'),
        `<meta HTTP-EQUIV='Content-Security-Policy' CONTENT="${commonCspString}">`
    )
}

function toNginxDirectiveString(commonCspString) {
    setTextAreaValue(
        document.getElementById('cspNginxDirectiveInput'),
        `add_header Content-Security-Policy ${commonCspString} always;`
    )
}


// Return the context document's performance entries as a resource type keyed object
function getResourcesTypeDomains() {
    let resourceList = { link: {}, img: {}, script: {}, iframe: {} }
    window.performance.getEntries().forEach(entry => {
        if (entry.initiatorType in resourceList) {
            // Origins are stored as keys to ensure uniqueness
            resourceList[entry.initiatorType][(new URL(entry.name)).origin] = true
        }
    })
    return resourceList
}

// Attach copy textarea value listeners
[...document.getElementsByClassName('copy-previous')].forEach(el => {
    const copyText = 'Copy'
    el.addEventListener('click', event => {
        // Clipboard API granted in manifest
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

// Parse the resources of the current tab
chrome.tabs.query({ active: true, currentWindow: true }).then(results => {
    // Record the tab's origin so we can evaluate 'self' in the generated CSP
    tabOrigin = (new URL(results[0].url)).origin

    // Executes the resource getter function in the tab's own context
    chrome.scripting.executeScript({
        target: {
            tabId: results[0].id
        }, // No frames, they each have their own CSP
        function: getResourcesTypeDomains
    }).then(injectionResults => {
        // Expects only 1 result from the current tab's context
        const resourceList = injectionResults[0].result
        toResourceList(resourceList)

        const commonCspString = toCommonCspString(resourceList)
        toCspHeaderString(commonCspString)
        toMetaTagString(commonCspString)
        toNginxDirectiveString(commonCspString)
    })
})
