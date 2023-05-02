let input = document.getElementById('refInput')

document.getElementById('refButton').addEventListener('click', function () {
  popup(input.value)
})

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
})