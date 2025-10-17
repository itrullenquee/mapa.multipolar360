// app/map/DashboardLayoutClient.tsx
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavMain } from "@/components/nav-main"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider defaultOpen>
            {/* Lateral */}
            <AppSidebar />

            {/* Contenido (navbar + main) */}
            <SidebarInset>
                {/* Top Navbar */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <div className="flex h-14 items-center gap-3 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="h-6" />
                        {/* Acciones derecha */}
                        <div className="ml-auto flex items-center gap-2">
                            <NavMain items={[]} />
                        </div>
                    </div>
                </header>

                {/* Main */}
                <main className="min-h-[calc(100dvh-3.5rem)] px-4 py-6 md:px-6 bg-muted/30">
                    <div className="w-full">{children}</div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
