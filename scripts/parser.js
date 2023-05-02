let refToken = "76349dc45cf37c71c5b0093cf5ed6230e02d3b3b"

let token

let pageUrl = window.location.href

let options

let retryCounter = 0

async function getListingIds() {
  const listingList = document.getElementById('listingData')
  const listing = listingList.getElementsByClassName("list-card__tricky-link")
  Array.from(listing)

  const listingInfoPromises = Array.from(listing).map(async listing => {
    const url = listing.getAttribute('href')
    const itemId = url.substring(url.lastIndexOf('/') + 1)
    return getListingInfo(itemId)
  })
    
  
  const listingInfoResults = await Promise.all(listingInfoPromises)

  const fetchBikeDataPromises = await listingInfoResults.map(async listingInfo => {
    const yearRequirements = await getYearReq()

    let yearReq

    if (yearRequirements !== undefined && Array.isArray(yearRequirements)) {
      yearReq = yearRequirements.find(req =>
        listingInfo.make.id === req.make &&
        (listingInfo.model?.id ?? null) === req.model

      )
    } else {
      yearReq = null
    }

    let yearRange
    let yearMin
    let yearMax

    if (yearReq) {
      for (let i = 0; i < yearReq.year_range.length; i++) {
        if (listingInfo.year >= yearReq.year_range[i][0] && listingInfo.year <= yearReq.year_range[i][1]) {
          yearRange = yearReq.year_range[i]
          break
        }
      }
      if (yearRange) {
        yearMin = yearRange[0]
        yearMax = yearRange[1]
      } else {
        yearMin = listingInfo.year - 1
        yearMax = listingInfo.year + 1
      }
    } else {
      yearMin = listingInfo.year - 1
      yearMax = listingInfo.year + 1
    }

      return fetchBikeData (
        listingInfo.make.id,
        listingInfo.model?.id,
        listingInfo.bikeType.id,
        listingInfo.modelType,
        listingInfo.modelTypeName,
        listingInfo.engineSize,
        listingInfo.fuelType,
        listingInfo.kilometers - 10000,
        listingInfo.kilometers + 10000,
        yearMin,
        yearMax
      )
  })



  const fetchBikeDataResults = await Promise.all(fetchBikeDataPromises)

  for (let i = 0; i < listing.length; i++) {
    const badge = createBadgeElement(fetchBikeDataResults[i], listingInfoResults[i])
    listing[i].insertAdjacentElement("afterend", badge)
  }
}




async function getListingInfo(id) {
  const url = 'https://api.nettix.fi/rest/bike/ad/' + id
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


async function fetchBikeData(
  make,
  model,
) {
  const queryParams = new URLSearchParams({
    make,
    model,
  })


  const url = `https://api.nettix.fi/rest/bike/pricing-tool-count?${queryParams.toString()}`

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
    if (data && data.token) {
      token = data.token.access_token
      console.log('Token found in local storage' + token)
      if (retryCounter < 3) {
        retryCounter++
        checkIfTokenExpired()
    } else {
      alert("Failed to get token after 3 retries")
    }
  } else {
    console.error("ERROR: No token found in local storage.")
    if (retryCounter < 3) {
      retryCounter++
      getNewToken()
    } else {
      alert("Failed to get token after 3 retries.")
    }
   }
 })
}

function getRefToken() {
  chrome.storage.local.get("refToken", function (data) {
    if (data && data.refToken) {
      refToken = data.refToken
      console.log("Reftoken found in local storage: " + refToken)
      getToken()
    } else {
      console.error("ERROR: No reftoken found in local storage.")
    }
  })
}

async function checkIfTokenExpired() {
  const url = 'https://api.nettix.fi/rest/bike/options/bikeType'

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

function createBadgeElement(info, listing) {
  const badge = document.createElement("p")
  badge.style.color = "white"
  badge.textContent = `yksit.avg = ${info.forsale.seller.averagePrice}, # = ${info.forsale.seller.totalAds} liik.avg = ${info.forsale.dealer.averagePrice}, # = ${info.forsale.dealer.totalAds}`
  badge.style.background = "#FF7F50"
  badge.style.display = "inline-block"
  badge.style.padding = "5px"
  badge.style.borderRadius = "10px"

  badge.style.position = "relative"
  badge.style.cursor = "pointer"
  badge.style.zIndex = "100"

  const hoverText = document.createElement("span")
  hoverText.style.position = "absolute"
  hoverText.style.top = "100%"
  hoverText.style.left = "50%"
  hoverText.style.transform = "translateX(-50%)"
  hoverText.style.display = "none"
  hoverText.style.background = "black"
  hoverText.style.color = "white"
  hoverText.style.padding = "5px"
  hoverText.style.borderRadius = "5px"
  hoverText.style.whiteSpace = "nowrap"
  hoverText.textContent = "Average price / How many results"

  badge.appendChild(hoverText)
  badge.addEventListener("mouseenter", () => {
    hoverText.style.display = "block"
  })

  badge.addEventListener("mouseleave", () => {
    hoverText.style.display = "none"
  })

  badge.addEventListener("click", async () => {
    if (!badge.querySelector(".infoBox")) {
      const infoBox = document.createElement("div")
      infoBox.classList.add("infoBox")
      infoBox.textContent = "Bike Type: " + listing.bikeType?.fi + ", Make: " + listing.make?.name + ", Model: " + listing.model?.name + ", Model Type: " + listing.modelType?.name
      badge.appendChild(infoBox)

      const yearRequirements = await getYearReq()

      let yearReq

      if (yearRequirements !== undefined && Array.isArray(yearRequirements)) {
        yearReq = yearRequirements.find(req =>
          listing.make.id === req.make &&
          (listing.model?.id ?? null) === req.model
        )
      } else {
        yearReq = null
      }

      let yearRange
      let yearMin
      let yearMax

      if (yearReq) {
        for (let i = 0; i < yearReq.year_range.length; i++) {
          if (listing.year >= yearReq.year_range[i][0] && listing.year <= yearReq.year_range[i][1]) {
            yearRange = yearReq.year_range[i]
            break
          }
        }
        if (yearRange) {
          yearMin = yearRange[0]
          yearMax = yearRange[1]
        } else {
          yearMin = listing.year - 1
          yearMax = listing.year + 1
        }
      } else {
        yearMin = listing.year - 1
        yearMax = listing.year + 1
      }

      const input1 = document.createElement("input")
      input1.type = "number"
      input1.placeholder = "yearfrom"
      input1.value = yearMin
      infoBox.appendChild(input1)

      const dash = document.createTextNode(" - ")
      infoBox.appendChild(dash)

      const input2 = document.createElement("input")
      input2.type = "number"
      input2.placeholder = "yearTo"
      input2.value = yearMax
      infoBox.appendChild(input2)

      const okButton = document.createElement("button")
      okButton.textContent = "OK"
      infoBox.appendChild(okButton)

      okButton.addEventListener("click", async () => {

        value1 = Number(input1.value)
        value2 = Number(input2.value)


        const newYearRange = [value1, value2]


        const newYearRequirements = await updateYearRequirements(listing, newYearRange)


        chrome.storage.local.set({ yearRequirements: newYearRequirements }, function () {
          if (chrome.runtime.lastError) {
            console.error("ERROR: newYearRequirements was not set to local storage")
            alert("Couldn't set new newYearRequirements to local storage")
          } else {
            console.log("newYearRequirements set to local storage")
          }
        })
      })
    }
  })

  document.addEventListener("click", (event) => {
    if (!badge.contains(event.target)) {
      const infoBox = badge.querySelector(".infoBox")
      if (infoBox) {
        badge.removeChild(infoBox)
      }
    }
  })

  return badge

}
async function updateYearRequirements(listingInfo, year_range) {
  let yearRequirements = await getYearReq()
  console.log(listingInfo)


  const existingYearRequirement = yearRequirements.find((yearRequirement) => {
    return (
      yearRequirement.make === listingInfo.make.id &&
      yearRequirement.model === (listingInfo.model?.id ?? null)
    )
  })

  if (existingYearRequirement) {
    existingYearRequirement.year_range.push(year_range)
  } else {
    yearRequirements.push({
      make: listingInfo.make.id,
      model: listingInfo.model?.id ?? null,
      year_range: [year_range]
    })
  }
  return (yearRequirements)
}


function checkIfPageChange() {

  setInterval(() => {
    if (window.location.href !== pageUrl) {
      pageUrl = window.location.href
    }
  }, 1000)
}

async function getYearReq() {
  return new Promise((resolve) => {
    chrome.storage.local.get("yearRequirements", function (data) {
      if (Array.isArray(data.yearRequirements)) {
        resolve(data.yearRequirements)
      } else {
        resolve([])
      }
    })
  })
}

getToken()      
checkIfPageChange()