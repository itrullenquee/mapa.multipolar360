"use client"

import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useMemo,
} from "react"
import axios from "axios"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/** Cambia esto a sessionStorage si querés sesión por pestaña */
const STORAGE = typeof window !== "undefined" ? localStorage : undefined
const AUTH_KEY = "auth"

export interface ApiUser {
    id: number
    name: string
    email: string
    role?: string
    email_verified_at?: string | null
    created_at?: string
    updated_at?: string
}

export interface AuthResponse {
    access_token: string
    token_type: string // ej: "Bearer"
    user: ApiUser
}

/** Lo que guardamos en el storage */
export interface AuthState {
    token: string
    tokenType: string
    user: ApiUser
}

interface UserContextType {
    /** Estado crudo */
    auth: AuthState | null
    setAuth: React.Dispatch<React.SetStateAction<AuthState | null>>

    /** Derivados y helpers */
    isAuthenticated: boolean
    user: ApiUser | null
    token: string | null
    getAuthHeader: () => Record<string, string>

    /** Acciones */
    loginWithApiResponse: (payload: AuthResponse) => Promise<void>
    logout: () => Promise<void>
    hasRole: (role: string | string[]) => boolean
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

const DEFAULT_BY_ROLE: Record<string, string[]> = {
    // ⚠️ Ajustá estos paths a tu app (si usás /map en lugar de /mapa, cambialos)
    admin: ["/map", "/map/noticias"],
    user: ["/administrar-novedades"],
}

export function UserProvider({ children }: { children: ReactNode }) {
    const router = useRouter()

    const [auth, setAuth] = useState<AuthState | null>(() => {
        if (!STORAGE) return null
        try {
            const raw = STORAGE.getItem(AUTH_KEY)
            return raw ? (JSON.parse(raw) as AuthState) : null
        } catch {
            return null
        }
    })

    /** Persistencia */
    useEffect(() => {
        if (!STORAGE) return
        if (auth) STORAGE.setItem(AUTH_KEY, JSON.stringify(auth))
        else STORAGE.removeItem(AUTH_KEY)
    }, [auth])

    /** Axios: seteo global del header si hay token */
    useEffect(() => {
        if (auth?.token) {
            axios.defaults.headers.common["Authorization"] = `${auth.tokenType} ${auth.token}`
        } else {
            delete axios.defaults.headers.common["Authorization"]
        }
    }, [auth?.token, auth?.tokenType])

    /** Helpers derivados */
    const isAuthenticated = !!auth?.token
    const user = auth?.user ?? null
    const token = auth?.token ?? null

    const getAuthHeader = useCallback((): Record<string, string> => {
        if (!auth?.token) return {} as Record<string, string>
        return { Authorization: `${auth.tokenType} ${auth.token}` }
    }, [auth])

    const hasRole = useCallback(
        (role: string | string[]) => {
            if (!auth?.user?.role) return false
            const current = String(auth.user.role).toLowerCase()
            if (Array.isArray(role)) return role.some((r) => current === String(r).toLowerCase())
            return current === String(role).toLowerCase()
        },
        [auth?.user?.role]
    )

    /** LOGIN: recibe exactamente la respuesta de tu API */
    const loginWithApiResponse = useCallback(
        async (payload: AuthResponse) => {
            const next: AuthState = {
                token: payload.access_token,
                tokenType: payload.token_type || "Bearer",
                user: payload.user,
            }
            setAuth(next)

            // Header global para axios
            axios.defaults.headers.common["Authorization"] = `${next.tokenType} ${next.token}`

            // ⚡ Sincronizar cookies para el middleware (vía API route server-side)
            try {
                await fetch("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        role: (payload.user.role || "user").toLowerCase(), // "admin" | "user"
                        // token: next.token,             // opcional, el middleware NO lo necesita
                        // tokenType: next.tokenType,     // opcional
                        maxAgeSec: 60 * 60 * 8, // 8hs
                    }),
                })
            } catch {
                // Si falla, el middleware no verá la sesión; podés notificar si querés
            }

            toast.success("Sesión iniciada")

            // Redirección según rol
            const role = String(payload.user.role || "user").toLowerCase()
            router.replace(DEFAULT_BY_ROLE[role]?.[0] || "/")
        },
        [router]
    )

    /** LOGOUT */
    const logout = useCallback(
        async () => {
            const current = auth
            setAuth(null) // limpieza optimista

            try {
                if (current?.token && API_URL) {
                    await axios.post(`${API_URL}/logout`, null, {
                        headers: { Authorization: `${current.tokenType} ${current.token}` },
                    })
                }
            } catch (err: any) {
                // Ignoramos 401 de token expirado; informamos otros
                if (err?.response?.status !== 401) toast.error("No se pudo cerrar sesión")
            } finally {
                // Borrar cookies del middleware
                try {
                    await fetch("/api/session", { method: "DELETE" })
                } catch { }

                if (STORAGE) STORAGE.removeItem(AUTH_KEY)
                delete axios.defaults.headers.common["Authorization"]
                toast.success("Sesión cerrada")
                router.replace("/auth")
            }
        },
        [auth, router]
    )

    const value = useMemo<UserContextType>(
        () => ({
            auth,
            setAuth,
            isAuthenticated,
            user,
            token,
            getAuthHeader,
            loginWithApiResponse,
            logout,
            hasRole,
        }),
        [auth, isAuthenticated, user, token, getAuthHeader, loginWithApiResponse, logout, hasRole]
    )

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
