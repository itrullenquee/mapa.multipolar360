// app/api/session/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const { role, token, tokenType, maxAgeSec = 60 * 60 * 8 } = await req.json() as {
        role: "admin" | "user"
        token?: string
        tokenType?: string
        maxAgeSec?: number
    }

    const res = NextResponse.json({ ok: true })

    // Cookie con el rol (middleware solo necesita esto para decidir acceso)
    res.cookies.set("role", role, {
        httpOnly: true, // no accesible desde JS
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeSec,
    })

    // (Opcional) cookie para saber si está autenticado (sin exponer token real)
    res.cookies.set("auth_token", "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeSec,
    })

    // Si quisieras, podrías setear un refresh token o un token corto aquí también.
    // Evitaría poner el access token JWT completo en cookie si ya lo manejas en axios auth header.

    return res
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true })
    res.cookies.set("role", "", { path: "/", maxAge: 0 })
    res.cookies.set("auth_token", "", { path: "/", maxAge: 0 })
    return res
}
