let input = document.getElementById('refInput')

document.getElementById('refButton').addEventListener('click', function () {
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
  chrome.tabs.query({url: "*://*.nettimoto.com/*"}, (tabs) => {
      tabs.forEach((tab) => {
          chrome.tabs.reload(tab.id)
      })
  })

  location.reload()
}


/*
function popup(input) {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var activeTab = tabs[0]
    chrome.tabs.sendMessage(activeTab.id, { "message": input })
    chrome.storage.local.set({ refToken: input }, function () {
      if (chrome.runtime.lastError) {
        console.error('ERROR: Reftoken was not set to local storage')
        alert('Couldn´t set new reftoken to local storage')
      } else {
        console.log('Reftoken set to local storage')
        getToken()
      }
    })
  })
}


chrome.storage.local.get('refToken', function (data) {
  if (data && data.refToken) {
    refToken = data.refToken
    input.placeholder = refToken
  } else {
    console.error("ERROR: No reftoken found in local storage / popup.")
  }
}) */