"use client"

import type React from "react"
import { useState, useContext } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "sonner"
import { UserContext } from "../context/authContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Users } from "lucide-react"

interface FormData {
    email: string
    password: string
    rememberMe: boolean
}

type Props = {
    logoUrl?: string
}

/** Espera hasta que exista un token en contexto o storage */
async function waitForAuthToken(opts?: { timeoutMs?: number; intervalMs?: number }) {
    const timeoutMs = opts?.timeoutMs ?? 1500
    const intervalMs = opts?.intervalMs ?? 50
    const start = Date.now()
    const getToken = () => {
        try {
            const raw = localStorage.getItem("auth") || sessionStorage.getItem("auth")
            if (!raw) return null
            const parsed = JSON.parse(raw)
            return parsed?.token || null
        } catch {
            return null
        }
    }
    // primer chequeo rápido
    if (typeof window !== "undefined") {
        const t = getToken()
        if (t) return t
    }
    // pooling corto hasta timeout
    return await new Promise<string | null>((resolve) => {
        const iv = setInterval(() => {
            const t = getToken()
            const expired = Date.now() - start >= timeoutMs
            if (t || expired) {
                clearInterval(iv)
                resolve(t ?? null)
            }
        }, intervalMs)
    })
}

export default function LoginPage({ logoUrl }: Props) {
    const ctx = useContext(UserContext)!
    const { setUserData, setToken } = (ctx as any) || {}
    const loginWithApiResponse = (ctx as any)?.loginWithApiResponse as
        | ((p: { access_token: string; token_type: string; user: any }) => Promise<void> | void)
        | undefined

    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<FormData>({
        email: "",
        password: "",
        rememberMe: false,
    })

    const APP_PRIMARY = "#007BD6"
    const resolvedLogo =
        logoUrl || process.env.NEXT_PUBLIC_APP_LOGO || "/movimiento-popular-santiago-querido.png"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const { data, status } = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/login`,
                { email: formData.email, password: formData.password }
            )

            if (status !== 200) {
                toast.error("Credenciales inválidas")
                return
            }

            const access_token: string | undefined = data?.access_token ?? data?.token ?? undefined
            const token_type: string = data?.token_type || "Bearer"
            const user = data?.user ?? null
            if (!access_token || !user) {
                toast.error("Respuesta inválida del servidor")
                return
            }

            // Guarda preferencia de 'Recordarme'
            if (typeof window !== "undefined") {
                window.localStorage.setItem("rememberMe", formData.rememberMe ? "1" : "0")
            }

            // Setear header global YA para evitar 401 en la siguiente página
            axios.defaults.headers.common["Authorization"] = `${token_type} ${access_token}`

            // Estrategia A: tenés loginWithApiResponse (el provider hará el resto)
            if (loginWithApiResponse) {
                await Promise.resolve(loginWithApiResponse({ access_token, token_type, user }))
                // Si tu loginWithApiResponse ya hace router.replace según el rol, no hace falta seguir acá.
                // Igual esperamos a que el token esté realmente disponible por si hay hidratación/flush pendiente.
                await waitForAuthToken()
                return
            }

            // Estrategia B: sin contexto — manejamos storage y redirect acá
            setToken?.(access_token)
            setUserData?.(user)

            const auth = { token: access_token, tokenType: token_type, user }
            if (typeof window !== "undefined") {
                const useLocal = window.localStorage.getItem("rememberMe") === "1"
                const store = useLocal ? window.localStorage : window.sessionStorage
                store.setItem("auth", JSON.stringify(auth))
                store.setItem("token", access_token)
                store.setItem("userData", JSON.stringify(user))
                const other = useLocal ? window.sessionStorage : window.localStorage
                other.removeItem("auth")
                other.removeItem("token")
                other.removeItem("userData")
            }

            toast.success("Login exitoso")

            // ⏳ Esperar a que el token esté disponible antes de redirigir
            await waitForAuthToken()

            // Redirección según rol (solo si NO usaste loginWithApiResponse)
            const role = (user?.role || "").toLowerCase()
            if (role === "admin") {
                router.replace("/map")
            } else if (role === "user") {
                router.replace("/administrar-novedades")
            } else {
                router.replace("/map")
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || error?.response?.data?.message || "Error en el login")
            console.error("Error en login:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }))
    }

    return (
        <div className="min-h-screen relative">
            {/* Fondo con degradado */}
            <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, #E43B3B 0%, #9C4D7F 50%, #0E7AD6 100%)" }}
            />
            <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay bg-[radial-gradient(60rem_60rem_at_30%_50%,white,transparent_60%)]" />

            {/* Contenido */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src="/logos/logosgo.png"
                            alt="Movimiento Popular Santiago Querido"
                            className="h-20 w-auto object-contain drop-shadow-lg"
                        />
                    </div>

                    {/* Tarjeta de login */}
                    <Card className="shadow-2xl border-0">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-2xl font-bold" style={{ color: APP_PRIMARY }}>
                                Iniciar Sesión
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Accedé a tu cuenta
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700 font-medium">
                                        Correo electrónico
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="tu@correo.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="h-12 border-gray-300 focus:border-[#007BD6] focus:ring-[#007BD6]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-gray-700 font-medium">
                                        Contraseña
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="********"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            className="h-12 pr-12 border-gray-300 focus:border-[#007BD6] focus:ring-[#007BD6]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        checked={formData.rememberMe}
                                        onCheckedChange={(checked) =>
                                            setFormData((prev) => ({ ...prev, rememberMe: !!checked }))
                                        }
                                    />
                                    <Label htmlFor="remember" className="text-sm text-gray-600">
                                        Recordarme
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 text-lg font-semibold text-white transition-all duration-200 hover:shadow-lg"
                                    style={{ backgroundColor: APP_PRIMARY }}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Iniciando sesión...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Users size={20} />
                                            Ingresar
                                        </div>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
