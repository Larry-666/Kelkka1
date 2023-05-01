let refToken
// chrome.storage.local.clear()

let token

let options

let retryCounter = 0

async function getListingIds() {
  const listingList = document.getElementById("listingData")
  const mainBlocks = Array.from(listingList.children).filter(child => child.id && child.id.includes("mainBlock"))
  const newBadges = []

  const listingInfoPromises = mainBlocks.map(mainBlock => {
    const itemId = mainBlock.id.replace("mainBlock", "")
    return getListingInfo(itemId)
  })

  const listingInfoResults = await Promise.all(listingInfoPromises)

  const fetchCaravanDataPromises = listingInfoResults.map(async listingInfo => {
    const [yearMin, yearMax, kmMin, kmMax] = await getYearAndKm(listingInfo)

    return fetchCaravanData(
      "100",
      "soldDate",
      "desc",
      "sold",
      listingInfo.vehicleType.id,
      listingInfo.make.id,
      listingInfo.model?.id,
      listingInfo.modelInfo,
      listingInfo.base?.id,
      "true",
      kmMin,
      kmMax,
      yearMin,
      yearMax
    )
  })

  const fetchCaravanDataResults = await Promise.all(fetchCaravanDataPromises)

  for (let i = 0; i < mainBlocks.length; i++) {
    const existingBadge = mainBlocks[i].querySelector("p")
    if (!existingBadge) {
      const badge = createBadgeElement(fetchCaravanDataResults[i], listingInfoResults[i], mainBlocks[i])
      mainBlocks[i].insertAdjacentElement('beforeend', badge)
      newBadges.push(badge)
    }
  }
  return newBadges
}

async function getListingInfo(id) {
  const url = "https://api.nettix.fi/rest/caravan/ad/" + id
  try {
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.json()

      return data
    }
    throw new Error("Network response was not ok.")
  } catch (error) {
    console.error("Error fetching listing info:", error)
    return null
  }
}

async function fetchCaravanData(
  rows,
  sortBy,
  sortOrder,
  status,
  vehicleType,
  make,
  model,
  modelInfo,
  base,
  includeMakeModel,
  kilometersFrom,
  kilometersTo,
  yearFrom,
  yearTo,
  diagnostic
) {
  const queryParams = new URLSearchParams({
    rows,
    sortBy,
    sortOrder,
    status,
    vehicleType,
    make,
    model,
    modelInfo,
    base,
    includeMakeModel,
    kilometersFrom,
    kilometersTo,
    yearFrom,
    yearTo
  })

  if (diagnostic) {
    console.log(queryParams.toString())
  }

  const url = `https://api.nettix.fi/rest/caravan/search?${queryParams.toString()}`

  try {
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.json()
      return data
    }
    throw new Error("Network response was not ok.")
  } catch (error) {
    console.error("ERROR fetching listing info:", error)
    return null
  }
}

async function getNewToken() {
  const url = "https://auth.nettix.fi/oauth2/token"
  const myHeaders = new Headers()
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded")

  const urlencoded = new URLSearchParams()
  urlencoded.append("grant_type", "refresh_token")
  urlencoded.append("refresh_token", refToken)

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow"
  }

  try {
    const response = await fetch(url, requestOptions)
    const result = JSON.parse(await response.text())

    chrome.storage.local.set({ token: result }, () => {
      if (chrome.runtime.lastError) {
        console.error("ERROR: Token was not set to local storage")
        alert("Uutta tunnusta ei voitu asettaa paikalliseen tallennustilaan")
      } else {
        console.log("New token set to local storage")
        getToken()
      }
    })
  } catch (error) {
    console.error(error)
  }
}

async function getToken() {
  chrome.storage.local.get("token", (data) => {
    if (data && data.token) {
      token = data.token.access_token
      console.log("Token found in local storage: " + token)
      if (retryCounter < 3) {
        retryCounter++
        checkIfTokenExpired()
      } else {
        alert("Tunnuksen haku epäonnistui kolmen yrityksen jälkeen")
      }
    } else {
      console.error("ERROR: No token found in local storage.")
      if (retryCounter < 3) {
        retryCounter++
        getNewToken()
      } else {
        alert("Tunnuksen haku epäonnistui kolmen yrityksen jälkeen")
      }
    }
  })
}

function getRefToken() {
  chrome.storage.local.get("refToken", (data) => {
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
  const url = "https://api.nettix.fi/rest/caravan/options/vehicleType"

  options = {
    method: "GET",
    headers: {
      "accept": "application/json",
      "X-Access-Token": token,
      "access_token": token
    }
  }

  try {
    const response = await fetch(url, options)
    if (response.ok) {
      getListingIds()
      console.log("Token works")
    } else {
      throw new Error("network response was not ok.")
    }
  } catch (error) {
    console.error("ERROR: Token didn't work ", error)
    getNewToken()
  }

}

function getAveragePrice(listings) {
  let total = 0
  for (let i = 0; i < listings.length; i++) {
    total += listings[i].price
  }

  return (listings.length > 0) ? Math.round((total / listings.length)) : "-"
}

function createBadgeElement(info, listing, mainBlock) {
  const badge = document.createElement("p")
  badge.style.color = "white"
  badge.textContent = `avg = ${getAveragePrice(info)}, # = ${info.length}`
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
  hoverText.textContent = "Keskihinta / Kuinka monta tulosta"

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
      infoBox.textContent = "Vehicle Type: " + listing.vehicleType?.fi + ", Make: " + listing.make?.name + ", Model: " + listing.model?.name + ", Model Info: " + listing.modelInfo + ", Base: " + listing.base?.fi
      badge.appendChild(infoBox)

      const [yearMin, yearMax, kmMin, kmMax, req] = await getYearAndKm(listing)

      const year = document.createElement("div")
      year.style.marginTop = "1%"
      infoBox.appendChild(year)

      const yearText = document.createElement("h3")
      yearText.textContent = "Vuosi:"
      year.appendChild(yearText)

      const yearRangeDiv = document.createElement("div")
      year.appendChild(yearRangeDiv)

      const yearMinInput = document.createElement("input")
      yearMinInput.type = "number"
      yearMinInput.placeholder = "Year From"
      yearMinInput.value = yearMin
      yearRangeDiv.appendChild(yearMinInput)

      const yearRangeSeparator = document.createTextNode(" - ")
      yearRangeDiv.appendChild(yearRangeSeparator)

      const yearMaxInput = document.createElement("input")
      yearMaxInput.type = "number"
      yearMaxInput.placeholder = "Year To"
      yearMaxInput.value = yearMax
      yearRangeDiv.appendChild(yearMaxInput)

      const yearOkButton = document.createElement("button")
      yearOkButton.textContent = "OK"
      yearRangeDiv.appendChild(yearOkButton)

      const yearViewAllButton = document.createElement("button")
      yearViewAllButton.textContent = "Näytä kaikki"
      yearRangeDiv.appendChild(yearViewAllButton)

      const km = document.createElement("div")
      km.style.marginTop = "1%"
      infoBox.appendChild(km)

      const kmText = document.createElement("h3")
      kmText.textContent = "Kilometrit:"
      km.appendChild(kmText)

      const kmRangeDiv = document.createElement("div")
      km.appendChild(kmRangeDiv)

      const kmMinInput = document.createElement("input")
      kmMinInput.type = "text"
      kmMinInput.value = kmMin.toLocaleString("fi-FI")
      kmMinInput.dataset.value = kmMin
      kmRangeDiv.appendChild(kmMinInput)

      const kmDash = document.createTextNode(" - ")
      kmRangeDiv.appendChild(kmDash)

      const kmMaxInput = document.createElement("input")
      kmMaxInput.type = "text"
      kmMaxInput.value = kmMax.toLocaleString("fi-FI")
      kmMaxInput.dataset.value = kmMax
      kmRangeDiv.appendChild(kmMaxInput)

      const kmOkButton = document.createElement("button")
      kmOkButton.textContent = "OK"
      kmRangeDiv.appendChild(kmOkButton)

      const kmViewAllButton = document.createElement("button")
      kmViewAllButton.textContent = "Näytä kaikki"
      kmRangeDiv.appendChild(kmViewAllButton)

      const reloadButtonWrapper = document.createElement("div")
      reloadButtonWrapper.style.textAlign = "center"
      infoBox.appendChild(reloadButtonWrapper)

      const reloadButton = document.createElement("button")
      reloadButton.textContent = "lataa nämä tiedot uudelleen"
      reloadButton.style.marginTop = "1%"
      reloadButtonWrapper.appendChild(reloadButton)

      yearOkButton.addEventListener("click", async () => {
        let yearMinValue = Number(yearMinInput.value)
        let yearMaxValue = Number(yearMaxInput.value)

        if (yearMinValue > yearMaxValue) {
          [yearMinValue, yearMaxValue] = [yearMaxValue, yearMinValue]
          const newYearRange = [yearMinValue, yearMaxValue]
          const newYearRequirements = await updateRequirements(listing, newYearRange, undefined)

          chrome.storage.local.set({ requirements: newYearRequirements }, () => {
            if (chrome.runtime.lastError) {
              console.error("ERROR: requirements was not set to local storage")
              alert("Ei voitu asettaa uusia vuosi vaatimuksia paikalliseen tallennustilaan")
            } else {
              console.log("requirements set to local storage")
              req.year_range.push(newYearRange)
            }
          })
        } else {
          const newYearRange = [yearMinValue, yearMaxValue]
          const newYearRequirements = await updateRequirements(listing, newYearRange, undefined)

          chrome.storage.local.set({ requirements: newYearRequirements }, () => {
            if (chrome.runtime.lastError) {
              console.error("ERROR: requirements was not set to local storage")
              alert("Ei voitu asettaa uusia vuosi vaatimuksia paikalliseen tallennustilaan")
            } else {
              console.log("requirements set to local storage")
              req.year_range.push(newYearRange)
            }
          })
        }
        document.dispatchEvent(new Event('click'))
        setTimeout(() => {
          badge.click()
        }, 100)
      })

      yearViewAllButton.addEventListener("click", () => {
        if (shouldAddYearRanges) {
          const viewAll = document.createElement("div")
          viewAll.classList.add("viewAll")
          yearRangeDiv.appendChild(viewAll)

          if (req) {
            for (let i = 0; i < req.year_range.length; i++) {
              if (req.year_range) {
                let yearRange = req.year_range[i]

                const value = document.createElement("h3")
                const remove = document.createElement("button")
                const valueRemovePair = document.createElement("div")

                valueRemovePair.style.display = "flex"
                valueRemovePair.style.flexDirection = "row"
                yearRangeDiv.appendChild(valueRemovePair)

                value.setAttribute("id", "value " + i)
                value.textContent = yearRange[0] + " - " + yearRange[1]
                valueRemovePair.appendChild(value)

                remove.textContent = "Poista"
                valueRemovePair.appendChild(remove)

                remove.addEventListener("click", async () => {
                  await removeRequirements(listing, yearRange, undefined)
                  valueRemovePair.remove()
                })
              }
            }
            shouldAddYearRanges = false
          }
        }
      })

      kmOkButton.addEventListener("click", async () => {
        let kmMinValue = Number(kmMaxInput.dataset.value)
        let kmMaxValue = Number(kmMinInput.dataset.value)

        if (kmMinValue > kmMaxValue) {
          [kmMinValue, kmMaxValue] = [kmMaxValue, kmMinValue]
          const newkmRange = [kmMinValue, kmMaxValue]
          const newkmRequirements = await updateRequirements(listing, undefined, newkmRange)

          chrome.storage.local.set({ requirements: newkmRequirements }, () => {
            if (chrome.runtime.lastError) {
              console.error("ERROR: requirements was not set to local storage")
              alert("Ei voitu asettaa uusia vuosi vaatimuksia paikalliseen tallennustilaan")
            } else {
              console.log("requirements set to local storage")
              req.year_range.push(newkmRange)
            }
          })
        } else {
          const newkmRange = [kmMinValue, kmMaxValue]
          const newkmRequirements = await updateRequirements(listing, undefined, newkmRange)

          chrome.storage.local.set({ requirements: newkmRequirements }, () => {
            if (chrome.runtime.lastError) {
              console.error("ERROR: requirements was not set to local storage")
              alert("Ei voitu asettaa uusia vuosi vaatimuksia paikalliseen tallennustilaan")
            } else {
              console.log("requirements set to local storage")
              req.year_range.push(newkmRange)
            }
          })
        }
        document.dispatchEvent(new Event('click'))
        setTimeout(() => {
          badge.click()
        }, 100)
      })

      kmViewAllButton.addEventListener("click", () => {
        if (shouldAddkmRanges) {
          const viewAll = document.createElement("div")
          viewAll.classList.add("viewAll")
          kmRangeDiv.appendChild(viewAll)

          if (req) {
            for (let i = 0; i < req.km_range.length; i++) {
              if (req.km_range) {
                let kmRange = req.km_range[i]

                const value = document.createElement("h3")
                const remove = document.createElement("button")
                const valueRemovePair = document.createElement("div")

                valueRemovePair.style.display = "flex"
                valueRemovePair.style.flexDirection = "row"
                kmRangeDiv.appendChild(valueRemovePair)

                value.setAttribute("id", "value " + i)
                value.textContent = kmRange[0].toLocaleString("fi-FI") + " - " + kmRange[1].toLocaleString("fi-FI")
                valueRemovePair.appendChild(value)

                remove.textContent = "Poista"
                valueRemovePair.appendChild(remove)

                remove.addEventListener("click", async () => {
                  await removeRequirements(listing, undefined, kmRange)
                  valueRemovePair.remove()
                })
              }
            }
          }
          shouldAddkmRanges = false
        }
      })

      kmMinInput.addEventListener("input", () => {
        const numericValue = kmMinInput.value.replace(/[^0-9]/g, "")
        kmMinInput.dataset.value = numericValue
        kmMinInput.value = Number(numericValue).toLocaleString("fi-FI")
      })

      kmMaxInput.addEventListener("input", () => {
        const numericValue = kmMaxInput.value.replace(/[^0-9]/g, "")
        kmMaxInput.dataset.value = numericValue
        kmMaxInput.value = Number(numericValue).toLocaleString("fi-FI")
      })

      reloadButton.addEventListener("click", () => {
        badge.remove()
        reloadListing(listing, mainBlock).then((newBadges) => {
          newBadges.forEach((badge) => {
            badge.click()
          })
        })
      })

      let shouldAddYearRanges = true
      let shouldAddkmRanges = true
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

async function updateRequirements(listingInfo, year_range, km_range) {
  let requirements = await getReq()

  const existingRequirement = requirements.find((req) => {
    return (
      req.vehicleType === listingInfo.vehicleType.id &&
      req.make === listingInfo.make.id &&
      req.model === (listingInfo.model?.id ?? null) &&
      req.base === (listingInfo.base?.id ?? null) &&
      req.modelInfo === (listingInfo.modelInfo ?? null)
    )
  })

  if (existingRequirement && year_range) {
    existingRequirement.year_range.push(year_range)
  } else if (existingRequirement && km_range) {
    existingRequirement.km_range.push(km_range)
  } else {
    requirements.push({
      vehicleType: listingInfo.vehicleType.id,
      make: listingInfo.make.id,
      model: listingInfo.model?.id ?? null,
      base: listingInfo.base?.id ?? null,
      modelInfo: listingInfo.modelInfo ?? null,
      year_range: year_range ? [year_range] : [],
      km_range: km_range ? [km_range] : []
    })
  }
  return (requirements)
}

async function removeRequirements(listingInfo, yearRange, kmRange) {
  let requirements = await getReq()

  if (kmRange) {
    const existingRequirement = requirements.find((kmRequirement) => {
      return (
        kmRequirement.vehicleType === listingInfo.vehicleType.id &&
        kmRequirement.make === listingInfo.make.id &&
        kmRequirement.model === (listingInfo.model?.id ?? null) &&
        kmRequirement.base === (listingInfo.base?.id ?? null) &&
        kmRequirement.modelInfo === (listingInfo.modelInfo ?? null)
      )
    })

    existingRequirement.km_range = existingRequirement.km_range.filter(
      range => !(range[0] === kmRange[0] && range[1] === kmRange[1])
    )

    requirements.forEach((req) => {
      if (
        req.make === existingRequirement.make &&
        req.model === existingRequirement.model &&
        req.vehicleType === existingRequirement.vehicleType &&
        req.base === existingRequirement.base &&
        req.modelInfo === existingRequirement.modelInfo
      ) {
        req.km_range = existingRequirement.km_range
      }
    })
  }

  if (yearRange) {
    const existingRequirement = requirements.find((yearRequirement) => {
      return (
        yearRequirement.vehicleType === listingInfo.vehicleType.id &&
        yearRequirement.make === listingInfo.make.id &&
        yearRequirement.model === (listingInfo.model?.id ?? null) &&
        yearRequirement.base === (listingInfo.base?.id ?? null) &&
        yearRequirement.modelInfo === (listingInfo.modelInfo ?? null)
      )
    })

    existingRequirement.year_range = existingRequirement.year_range.filter(
      range => !(range[0] === yearRange[0] && range[1] === yearRange[1])
    )

    requirements.forEach((req) => {
      if (
        req.make === existingRequirement.make &&
        req.model === existingRequirement.model &&
        req.vehicleType === existingRequirement.vehicleType &&
        req.base === existingRequirement.base &&
        req.modelInfo === existingRequirement.modelInfo
      ) {
        req.year_range = existingRequirement.year_range
      }
    })
  }

  chrome.storage.local.set({ requirements: requirements }, () => {
    if (chrome.runtime.lastError) {
      console.error("ERROR: requirements was not set to local storage")
      alert("Ei voitu asettaa uusia vuosi vaatimuksia paikalliseen tallennustilaan")
    } else {
      console.log("requirements set to local storage")
    }
  })
}

async function getReq() {
  return new Promise((resolve) => {
    chrome.storage.local.get("requirements", (data) => {
      if (Array.isArray(data.requirements)) {
        resolve(data.requirements)
      } else {
        resolve([])
      }
    })
  })
}

async function getYearAndKm(listing) {
  const yearRequirements = await getReq()

  let req

  if (yearRequirements) {
    req = yearRequirements.find(req =>
      listing.vehicleType.id === req.vehicleType &&
      listing.make.id === req.make &&
      (listing.model?.id ?? null) === req.model &&
      (listing.modelInfo ?? null) === req.modelInfo &&
      (listing.base?.id ?? null) === req.base
    )
  } else {
    req = null
  }

  let yearRange
  let yearMin
  let yearMax
  let kmRange
  let kmMin
  let kmMax

  if (req) {
    for (let i = 0; i < req.year_range.length; i++) {
      if (listing.year >= req.year_range[i][0] && listing.year <= req.year_range[i][1]) {
        yearRange = req.year_range[i]
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

  if (req) {
    for (let i = 0; i < req.km_range.length; i++) {
      if (listing.kilometers >= req.km_range[i][0] && listing.kilometers <= req.km_range[i][1]) {
        kmRange = req.km_range[i]
        break
      }
    }

    if (kmRange) {
      kmMin = kmRange[0]
      kmMax = kmRange[1]
    } else {
      kmMin = listing.kilometers - 10000
      kmMax = listing.kilometers + 10000
    }
  } else {
    kmMin = listing.kilometers - 10000
    kmMax = listing.kilometers + 10000
  }

  return ([yearMin, yearMax, kmMin, kmMax, req])
}

async function reloadListing(listing, mainBlock) {
  const [yearMin, yearMax, kmMin, kmMax] = await getYearAndKm(listing)

  const fetchCaravanDataResult = await fetchCaravanData(
    "100",
    "soldDate",
    "desc",
    "sold",
    listing.vehicleType.id,
    listing.make.id,
    listing.model?.id,
    listing.modelInfo,
    listing.base?.id,
    "true",
    kmMin,
    kmMax,
    yearMin,
    yearMax,
    true
  )

  const badge = createBadgeElement(fetchCaravanDataResult, listing, mainBlock)
  mainBlock.insertAdjacentElement('beforeend', badge)
  const newBadges = [badge]

  return newBadges
}

function checkIfPageChange() {
  let pageUrl = window.location.href
  setInterval(() => {
    if (window.location.href !== pageUrl) {
      pageUrl = window.location.href
      checkIfTokenExpired()
    }
  }, 1000)
}

getRefToken()

checkIfPageChange()