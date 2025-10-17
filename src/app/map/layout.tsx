// app/map/layout.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import React from "react"
import DashboardLayoutClient from "./DashboardLayoutClient"

export default function MapLayout({ children }: { children: React.ReactNode }) {
    const role = cookies().get("role")?.value?.toLowerCase()
    if (role !== "admin") {
        redirect("/unauthorized?from=/map")
    }

    // Si es admin, renderiza tu shell cliente
    return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
