import axios from "axios"
import fs from "fs"

interface SearchResponse {
    place_id: number
    osm_type: string
    osm_id: number
    type: string
}

async function fetchOsmIdByCity(city: string): Promise<number> {

    const params = `?q=${encodeURI(city)}&format=json`
    const url = `https://nominatim.openstreetmap.org/search${params}`

    let response

    try {
        response = await axios.get(url)
    } catch (error) {
        return Promise.reject({ msg: "Can't get osm id", error })
    }

    const searchEntries = response.data as SearchResponse[]

    const found = searchEntries.filter(entry => 
        entry.type == "city" && entry.osm_type == "relation"
    ).map(entry => entry.osm_id)[0]

    console.log(`osm id for ${city}: ${found}`)

    return Promise.resolve(found)

}

async function fetchGeoJson(osmId: number): Promise<string> {

    console.log(`fetching geo for ${osmId}`)

    const url = `https://polygons.openstreetmap.fr/get_geojson.py?id=${osmId}&params=0`
    
    let response

    try {
        response = await axios.get(url)
    } catch (error) {
        return Promise.reject({ msg: "Can't get getJson", error })
    }

    try {
        return JSON.stringify(response.data, null, 2)
    } catch (error) {
        return Promise.reject({ msg: "Not valid json response", error })
    }

}

async function handleCity(city: string): Promise<string> {

    let resp: string;

    try {
        resp = await fetchOsmIdByCity(city)
            .then(id => fetchGeoJson(id))
    } catch (error) {
        return Promise.reject({ error })
    }

    return Promise.resolve(resp)

}

function readCitiesFile() {

    const fileContent = fs.readFileSync("cities.txt").toString()

    const resp = fileContent
        .split("\n")
        .filter(s => s != "")

    return resp

}

function main() {

    const cities = readCitiesFile()

    cities.slice(0, 3).forEach(async city => {
        try {
            const resp = await handleCity(city)
            fs.writeFileSync(`out/${city}.json`, resp)
        } catch (error) {
            console.log(`Skipping city ${city}, error: ${error}`)
        }
    })

}

main()
