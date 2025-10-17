"use client"

import * as React from "react"
import { Map, Newspaper, LogOut } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

import { UserContext } from "@/app/context/authContext"

type NavItem = {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
    isActive?: boolean
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter()
    const pathname = usePathname()
    const userCtx = React.useContext(UserContext)

    const role = (userCtx?.user?.role || "").toLowerCase()

    const adminNav: NavItem[] = React.useMemo(
        () => [
            { title: "Mapa", url: "/map", icon: Map },
            { title: "Noticias", url: "/map/noticias", icon: Newspaper },
        ],
        []
    )

    const userNav: NavItem[] = React.useMemo(
        () => [
            { title: "Administrar Novedades", url: "/map/administrar-novedades", icon: Newspaper },
        ],
        []
    )

    const items: NavItem[] = React.useMemo(() => {
        const base = role === "admin" ? adminNav : role === "user" ? userNav : []
        return base.map((it) => ({
            ...it,
            isActive: pathname === it.url || pathname.startsWith(it.url + "/"),
        }))
    }, [role, adminNav, userNav, pathname])

    const handleLogout = async () => {
        // Usa el logout del contexto (limpia storage, cookies y hace redirect)
        await userCtx?.logout?.()
    }

    return (
        <Sidebar variant="inset" {...props}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#E43B3B] via-[#9C4D7F] to-[#0E7AD6] rounded-lg" />
            <div className="relative z-10 flex flex-col h-full">
                {/* LOGO */}
                <div className="flex flex-col items-center justify-center py-6 px-4 border-b border-white/20">
                    <Image
                        src="/logos/logoadmin.png"
                        alt="Movimiento Popular Santiago Querido"
                        width={80}
                        height={80}
                        className="object-contain drop-shadow-lg"
                    />
                    <h1 className="text-lg font-extrabold text-center mt-3 leading-tight text-white">
                        Movimiento Popular <br /> Santiago Querido
                    </h1>
                </div>

                {/* HEADER */}
                <SidebarHeader className="px-3 mt-3">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                asChild
                                className="text-white hover:bg-blue-500/30 data-[state=open]:bg-blue-500/30"
                            >
                                <Link href="#">
                                    <div className="bg-white/20 text-white flex aspect-square size-9 items-center justify-center rounded-lg">
                                        <Map className="size-5" />
                                    </div>
                                    <div className="grid flex-1 text-left leading-tight ml-2">
                                        <span className="truncate font-semibold text-base text-white">Panel</span>
                                        <span className="truncate text-sm text-white/80">
                                            {role === "admin" ? "Administrador" : role === "user" ? "Usuario" : "Visitante"}
                                        </span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                {/* CONTENIDO */}
                <SidebarContent className="mt-4 flex-1">
                    <div className="[&_button]:text-white [&_a]:text-white [&_button:hover]:bg-blue-500/30 [&_a:hover]:bg-blue-500/30 [&_button[data-active=true]]:bg-blue-500/40 [&_a[data-active=true]]:bg-blue-500/40">
                        {/* NavMain recibe items ya filtrados por rol */}
                        <NavMain items={items} />
                    </div>
                </SidebarContent>

                {/* FOOTER */}
                <SidebarFooter className="border-t border-white/20 p-3">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-white hover:bg-blue-500/30 text-base font-semibold"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 size-5" />
                        Cerrar sesión
                    </Button>
                </SidebarFooter>
            </div>
        </Sidebar>
    )
}
