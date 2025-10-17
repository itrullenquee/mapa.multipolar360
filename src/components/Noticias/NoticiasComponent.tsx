// components/NoticiasComponent.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchNewsData, fetchNewsById, NewsItem } from "@/app/utils/NewsHelper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────
   Utils
───────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return `hace ${sec}s`
    const min = Math.floor(sec / 60)
    if (min < 60) return `hace ${min}m`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `hace ${hr}h`
    const d = Math.floor(hr / 24)
    return `hace ${d}d`
}

function safeImg(src?: string | null) {
    if (!src) return ""
    if (typeof window !== "undefined" && window.location.protocol === "https:" && src.startsWith("http://")) {
        return src.replace("http://", "https://")
    }
    return src
}

function Initials({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {initials}
        </div>
    )
}

/* ────────────────────────────────────────────────────────────
   Modal de detalle
───────────────────────────────────────────────────────────── */
function NewsDialog({
    newsId,
    open,
    onOpenChange,
}: {
    newsId: number | null
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const [loading, setLoading] = useState(false)
    const [item, setItem] = useState<NewsItem | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !newsId) return
        setLoading(true)
        setError(null)
        setItem(null)
            ; (async () => {
                try {
                    const data = await fetchNewsById(newsId)
                    setItem(data)
                } catch (e: any) {
                    setError(e?.message ?? "No se pudo cargar la noticia")
                } finally {
                    setLoading(false)
                }
            })()
    }, [open, newsId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl z-[10000]">
                <DialogHeader>
                    <DialogTitle>{item?.title ?? (loading ? "Cargando…" : "Detalle de noticia")}</DialogTitle>
                    {item && (
                        <DialogDescription className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{item.author?.name ?? "Autor"}</Badge>
                            <span className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                {item.address?.street_address ?? "Sin dirección"}
                            </span>
                        </DialogDescription>
                    )}
                </DialogHeader>

                {loading && (
                    <div className="space-y-3">
                        <div className="h-48 w-full rounded-lg bg-muted animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                    </div>
                )}

                {!loading && error && <div className="text-sm text-destructive">{error}</div>}

                {!loading && item && (
                    <div className="space-y-4">
                        {item.src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={safeImg(item.src) || "/placeholder/cover.jpg"}
                                alt={item.title}
                                className="w-full max-h-[420px] rounded-lg object-cover"
                                onError={(e) => ((e.currentTarget.src = "/placeholder/cover.jpg"))}
                            />
                        )}
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-wrap">{item.content}</p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

/* ────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────── */
export const NoticiasComponent = () => {
    const [items, setItems] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Estado para "Ver más"
    const [dialogOpen, setDialogOpen] = useState(false)
    const [currentId, setCurrentId] = useState<number | null>(null)
    const openDialog = (id: number) => {
        setCurrentId(id)
        setDialogOpen(true)
    }

    useEffect(() => {
        ; (async () => {
            try {
                const data = await fetchNewsData()
                const ordered = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                setItems(ordered)
            } catch (e: any) {
                setError(e?.message ?? "No se pudieron cargar las noticias")
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const [hero, rest] = useMemo<[NewsItem | null, NewsItem[]]>(() => {
        if (!items.length) return [null, []]
        return [items[0], items.slice(1)]
    }, [items])

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="h-40 w-full" />
                            <CardContent className="space-y-3 pt-4">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle>Error al cargar</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        )
    }

    if (!items.length) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">No hay noticias aún.</CardContent>
            </Card>
        )
    }

    return (
        <>
            <div className="space-y-8">
                {/* Nota destacada */}
                {hero && (
                    <article className="relative overflow-hidden rounded-2xl border">
                        <div className="grid gap-0 md:grid-cols-2">
                            {/* Imagen */}
                            <div className="relative h-64 md:h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={safeImg(hero.src) || "/placeholder/card.jpg"}
                                    alt={hero.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    loading="lazy"
                                    onError={(e) => ((e.currentTarget.src = "/placeholder/card.jpg"))}
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
                            </div>

                            {/* Texto */}
                            <div className="relative p-6 md:p-8">
                                <div className="mb-3 flex items-center gap-2">
                                    <Badge variant="secondary">Último momento</Badge>
                                    <span className="text-xs text-muted-foreground">{timeAgo(hero.created_at)}</span>
                                </div>

                                <h2 className="mb-3 text-2xl font-bold leading-tight md:text-3xl">{hero.title}</h2>

                                <p className="line-clamp-4 text-sm text-muted-foreground md:line-clamp-6">{hero.content}</p>

                                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Initials name={hero.author?.name ?? "Autor"} />
                                        <span>{hero.author?.name ?? "Autor desconocido"}</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        <span className="truncate">{hero.address?.street_address ?? "Ubicación no disponible"}</span>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <Button variant="default" onClick={() => openDialog(hero.id)}>
                                        Ver más
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </article>
                )}

                {/* Grilla de notas */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Más noticias</h3>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {rest.map((n) => (
                            <article
                                key={n.id}
                                className={cn("group overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-lg")}
                            >
                                {/* Imagen */}
                                <div className="relative h-44 w-full overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={safeImg(n.src) || "/placeholder/card.jpg"}
                                        alt={n.title}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                        loading="lazy"
                                        onError={(e) => ((e.currentTarget.src = "/placeholder/card.jpg"))}
                                    />
                                    <div className="absolute left-3 top-3">
                                        <Badge className="backdrop-blur">{n.mime?.split("/")[0] || "Nota"}</Badge>
                                    </div>
                                </div>

                                {/* Contenido */}
                                <div className="p-4">
                                    <h4 className="line-clamp-2 text-base font-semibold leading-snug">{n.title}</h4>

                                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.content}</p>

                                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Initials name={n.author?.name ?? "Autor"} />
                                            <span className="truncate max-w-[160px]">{n.author?.name ?? "Autor"}</span>
                                        </div>
                                        <span>{timeAgo(n.created_at)}</span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="truncate">{n.address?.street_address ?? "Ubicación no disponible"}</span>
                                    </div>

                                    <div className="mt-4">
                                        <Button size="sm" variant="secondary" onClick={() => openDialog(n.id)}>
                                            Ver más
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>

            {/* Modal de detalle */}
            <NewsDialog newsId={currentId} open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
    )
}
