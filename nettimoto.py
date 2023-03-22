import requests

# osoite vain esimerkkinä se pitää saada dynaamiseksi
url = "https://api.nettix.fi/rest/bike/ad/2918552"
#url = "https://api.nettix.fi/rest/bike/search?page=1&rows=30&sortBy=price&sortOrder=asc&latitude=60.5346&longitude=25.6074&isMyFavorite=false&make=29&model=1184&modelType=76&includeMakeModel=true&accessoriesCondition=and&isPriced=true&taxFree=false&vatDeduct=true&tagsCondition=and"
refresh_token = "449af38408826c8754fb20472b54cd7512f620e7"

# funktio tokenin uudistamiseksi
def renew_access_token(refresh_token):
    # Set the URL and data for the token renewal request
    token_url = "https://auth.nettix.fi/oauth2/token"
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    # Make the request and parse the response for the new access token
    response = requests.post(token_url, data=data)
    response.raise_for_status()
    access_token = response.json()["access_token"]
    return access_token

access_token = renew_access_token(refresh_token)

# uusi token on tässä käytössä
headers = {"X-Access-Token": access_token}
response = requests.get(url, headers=headers)
response.raise_for_status()

# tulostetaan vain hinta
data = response.json()

print(response) #printataan onnistuiko

print(data["price"]) # tällä saa yhden jos hakee vain yhtä
#print(access_token) #testiksi