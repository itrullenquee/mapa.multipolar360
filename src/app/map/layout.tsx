// app/map/layout.tsx (Server Component)
import React from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function MapLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies() // 👈 antes era sync, ahora puede ser Promise
    const role = cookieStore.get("role")?.value?.toLowerCase()

    if (role !== "admin") {
        redirect("/unauthorized?from=/map")
    }

    return <>{children}</>
    
}
