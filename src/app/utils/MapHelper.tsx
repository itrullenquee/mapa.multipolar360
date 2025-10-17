import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL
const getTokenSession = () => {
    if (typeof window === "undefined") return null

    // Intentamos leer el objeto completo guardado por el provider
    const stored =
        window.localStorage.getItem("auth") ||
        window.sessionStorage.getItem("auth")

    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            return parsed?.token ?? parsed?.access_token ?? null
        } catch {
            return null
        }
    }
    return (
        window.localStorage.getItem("token") ||
        window.sessionStorage.getItem("token")
    )
}

/**
 * Llama al endpoint /persons con el token actual.
 */
export const fetchMapData = async () => {
    const token = getTokenSession()
    if (!token) throw new Error("No se encontró token de sesión")

    try {
        const response = await axios.get(`${API_URL}/persons`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        console.log("Map data fetched:", response.data)
        return response.data
    } catch (error) {
        console.error("Error fetching map data:", error)
        throw error
    }
}

export const fetchComercioData = async () => {
    const token = getTokenSession()
    if (!token) throw new Error("No se encontró token de sesión")

    try {
        const response = await axios.get(`${API_URL}/comercios`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        console.log("Comercio data fetched:", response.data)
        return response.data
    } catch (error) {
        console.error("Error fetching comercio data:", error)
        throw error
    }
}