// app/utils/NewsHelper.ts
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/* ────────────────────────────────────────────────────────────
   Tipos
───────────────────────────────────────────────────────────── */
export interface NewsAuthor {
    id: number
    name: string
    email: string
    role: string
    email_verified_at: string | null
    created_at: string
    updated_at: string
}

export interface Address {
    id: number
    street_address: string
    barrio_id: number
    latitude: number
    longitude: number
    created_at: string
    updated_at: string
}

export interface PersonRecord {
    id: number
    person_id: number
    source_id: number
    address_id: number
    row_number: number | null
    user_id: number | null
    description: string | null
    created_at: string
    updated_at: string
    address: Address
}

export interface NewsItem {
    id: number
    user_id: number
    person_record_id: number | null
    address_id: number | null
    title: string
    content: string
    src: string | null
    mime: string | null
    size: number | null
    created_at: string
    updated_at: string
    author: NewsAuthor
    person_record?: PersonRecord | null
    address?: Address | null
}

export interface NewsIndexResponse {
    data: NewsItem[]
}
export interface NewsShowResponse {
    data: NewsItem
}

/* ────────────────────────────────────────────────────────────
   Auth helpers
───────────────────────────────────────────────────────────── */
export const getTokenSession = (): string | null => {
    if (typeof window === "undefined") return null
    const stored =
        window.localStorage.getItem("auth") ||
        window.sessionStorage.getItem("auth")
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            return parsed?.token ?? parsed?.access_token ?? null
        } catch {
            /* ignore */
        }
    }
    return (
        window.localStorage.getItem("token") ||
        window.sessionStorage.getItem("token")
    )
}

const authHeaders = () => {
    const token = getTokenSession()
    if (!token) throw new Error("No se encontró token de sesión")
    return { Authorization: `Bearer ${token}` }
}

/* ────────────────────────────────────────────────────────────
   Read
───────────────────────────────────────────────────────────── */
export const fetchNewsData = async (): Promise<NewsItem[]> => {
    const { data } = await axios.get<NewsIndexResponse>(
        `${API_URL}/noticias`,
        { headers: authHeaders() }
    )
    return (data as any).data ?? (data as any) ?? []
}

export const fetchNewsById = async (id: number): Promise<NewsItem> => {
    const { data } = await axios.get<NewsShowResponse>(
        `${API_URL}/noticias/${id}`,
        { headers: authHeaders() }
    )
    return (data as any).data ?? (data as any)
}

/* ────────────────────────────────────────────────────────────
   Create (multipart/form-data)
───────────────────────────────────────────────────────────── */
export type CreateNewsPayload = {
    title: string
    content: string
    image?: File | null
    person_record_id?: number | null
    address_id?: number | null
}

export const createNews = async (payload: CreateNewsPayload): Promise<NewsItem> => {
    const form = new FormData()
    form.append("title", payload.title)
    form.append("content", payload.content)

    // Enviar IDs solo si vienen definidos (no undefined/null)
    if (payload.person_record_id !== undefined && payload.person_record_id !== null) {
        form.append("person_record_id", String(payload.person_record_id))
    }
    if (payload.address_id !== undefined && payload.address_id !== null) {
        form.append("address_id", String(payload.address_id))
    }
    if (payload.image) {
        form.append("image", payload.image)
    }

    const { data } = await axios.post(`${API_URL}/noticias`, form, {
        headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
        },
    })

    // Respuesta envuelta o directa
    return (data as any).data ?? (data as any)
}

/* ────────────────────────────────────────────────────────────
   Update (POST + _method=PUT, multipart)
   Reglas:
   - undefined => no tocar
   - null => desasociar (mandamos "")
   - File => reemplaza imagen; si no se manda, mantiene actual
───────────────────────────────────────────────────────────── */
export type UpdateNewsPayload = {
    id: number
    title: string
    content: string
    image?: File | null
    person_record_id?: number | null
    address_id?: number | null
}

export const updateNews = async (payload: UpdateNewsPayload): Promise<NewsItem> => {
    const form = new FormData()
    form.append("_method", "PUT")
    form.append("title", payload.title)
    form.append("content", payload.content)

    if (payload.person_record_id !== undefined) {
        form.append("person_record_id", payload.person_record_id === null ? "" : String(payload.person_record_id))
    }
    if (payload.address_id !== undefined) {
        form.append("address_id", payload.address_id === null ? "" : String(payload.address_id))
    }
    if (payload.image instanceof File) {
        form.append("image", payload.image)
    }

    const { data } = await axios.post(`${API_URL}/noticias/${payload.id}`, form, {
        headers: {
            ...authHeaders(),
            "Content-Type": "multipart/form-data",
        },
    })

    // Respuesta envuelta o directa
    return (data as any).data ?? (data as any)
}

/* ────────────────────────────────────────────────────────────
   Delete
───────────────────────────────────────────────────────────── */
export const deleteNews = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/noticias/${id}`, {
        headers: authHeaders(),
    })
}
