// app/map/noticias/layout.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import React from "react"

export default function NoticiasLayout({ children }: { children: React.ReactNode }) {
    const role = cookies().get("role")?.value?.toLowerCase()
    if (role !== "admin") {
        redirect("/unauthorized?from=/map/noticias")
    }
    return <>{children}</>
}
