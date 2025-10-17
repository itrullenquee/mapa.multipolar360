// app/utils/api.ts
import axios from "axios"

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const authRaw = localStorage.getItem("auth") || sessionStorage.getItem("auth")
        if (authRaw) {
            const { token } = JSON.parse(authRaw)
            if (token) config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})
