let input = document.getElementById("refInput")

document.getElementById("refButton").addEventListener("click", () => {
  popup(input.value)
  refreshTabs()
})

document.getElementById("clearCacheButton").addEventListener("click", () => {
  chrome.storage.local.clear()
  refreshTabs()
})

function popup(input) {
  chrome.storage.local.set({ refToken: input })
}

chrome.storage.local.get("refToken", (data) => {
  if (data && data.refToken) {
    refToken = data.refToken
    input.placeholder = refToken
  }
})

function refreshTabs() {
  chrome.tabs.query({url: "*://*.nettikaravaani.com/*"}, (tabs) => {
      tabs.forEach((tab) => {
          chrome.tabs.reload(tab.id)
      })
  })

  location.reload()
}