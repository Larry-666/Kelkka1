const refToken = 'd721b5e3b85d762afd24e714f061172e9e158bb9'

var token

var pageUrl = window.location.href

var options

let retryCounter = 0

async function getListingIds() {

  options = {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-Access-Token': token,
      'access_token': token
    }
  }

  const listingList = document.getElementById('listingData')
  const listings = listingList.getElementsByClassName("list-card__tricky-link")
  console.log(listings.length)
   
     for (let i = 0; i < listings.length; i++) {
      const url = listings[i].getAttribute('href')
      const itemId = url.substring(url.lastIndexOf('/') + 1)
      const listingInfo = await getListingInfo(itemId)
      
      const listingHistory = await fetchBoatData(
        listingInfo.boatType.id,
        listingInfo.make.id,
        listingInfo.model,
        listingInfo.year - 1,
        listingInfo.year + 1,
        "false"
      )
      const badge = createBadgeElement(listingHistory)
  
      listings[i].insertAdjacentElement('afterend', badge) 
      }
 }



async function getListingInfo(id) {
  const url = 'https://api.nettix.fi/rest/boat/ad/' + id
  try {
    const response = await fetch(url, options)
   
   if (response.ok) {
      const data = await response.json()
      return data


    }
    
    throw new Error('Network response was not ok.')
  } catch (error) {
    console.error('Error fetching listing info:', error)
    return null
  }
}




async function fetchBoatData(
  boatType,
  make,
  model,
  yearFrom,
  yearTo,
  combineResult
  
  
) {
  const queryParams = new URLSearchParams({
    boatType,
    make,
    model,
    yearFrom,
    yearTo,
    combineResult
  

  })

  const url = `https://api.nettix.fi/rest/boat/pricing-tool-count?${queryParams.toString()}`


  try {
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.json()
      console.log(data)
      return data
    }
    throw new Error('Network response was not ok.')
  } catch (error) {
    console.error('ERROR fetching listing info:', error)
    return null
  }
}

function createBadgeElement(info) {
  const badge = document.createElement('p')
  badge.style.marginLeft = "500px"
  badge.style.color = 'red'
  badge.textContent = `avg = ${info.expired.all.averagePrice}`

  return badge
}


async function getNewToken() {
  const url = 'https://auth.nettix.fi/oauth2/token'
  const myHeaders = new Headers()
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded")

  const urlencoded = new URLSearchParams()
  urlencoded.append("grant_type", 'refresh_token')
  urlencoded.append("refresh_token", refToken)

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: urlencoded,
    redirect: 'follow'
  }

  try {
    const response = await fetch(url, requestOptions)
    const result = JSON.parse(await response.text())

    chrome.storage.local.set({ token: result }, function () {
      if (chrome.runtime.lastError) {
        console.error('ERROR: Token was not set to local storage')
        alert('Couldnt set new token to local storage')
      } else {
        console.log('Token set to local storage')
        getToken()
      }
    })
  } catch (error) {
    console.error(error)
    alert('ERROR: Failed to get new token.')
  }
}

async function getToken() {
  chrome.storage.local.get('token', function (data) {
    console.log(data.token)
    if (data && data.token) {
      token = data.token.access_token
      console.log('Token found in local storage')
      console.log(token)
      checkIfTokenExpired()
    } else {
      console.error("ERROR: No token found in local storage.")
      if (retryCounter < 3) {
        retryCounter++
        getNewToken()
      } else {
        console.error("Failed to get token after 1 retries.")
      }
    }
  })
}


async function checkIfTokenExpired() {
  const url = 'https://api.nettix.fi/rest/boat/options/boatType'

  options = {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-Access-Token': token,
      'access_token': token
    }
  }

  try {
    const response = await fetch(url, options)
    if (response.ok) {
      getListingIds()
      console.log("Token works")
    } else {
      throw new Error('network response was not ok.')
    }
  } catch (error) {
    console.error("ERROR: Token didn't work ", error)
    getNewToken()
  }

}


function checkIfPageChange() {

  setInterval(() => {
    if (window.location.href !== pageUrl) {
      pageUrl = window.location.href
      checkIfTokenExpired()
    }
  }, 1000)
}


getToken()

checkIfPageChange() 