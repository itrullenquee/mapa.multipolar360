// components/AdministrarNovedadesComponent.tsx
"use client"

import { useContext, useEffect, useMemo, useState } from "react"
import {
    fetchNewsData,
    fetchNewsById,
    createNews,
    updateNews,
    deleteNews,
    type NewsItem,
    type CreateNewsPayload,
    type UpdateNewsPayload,
} from "@/app/utils/NewsHelper"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
    Loader2,
    Plus,
    Search,
    Trash2,
    Pencil,
    ImagePlus,
    RefreshCcw,
    LogOut,
} from "lucide-react"

// ⬇️ importa tu contexto para usar logout()
import { UserContext } from "@/app/context/authContext"

const MAX_MB = 5
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const

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

const safeImg = (src?: string | null) => {
    if (!src) return ""
    if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        src.startsWith("http://")
    ) {
        return src.replace("http://", "https://")
    }
    return src
}

type Mode = "create" | "edit"

export const AdministrarNovedadesComponent = () => {
    const userCtx = useContext(UserContext)
    const logout = userCtx?.logout

    // tabla
    const [items, setItems] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [reloading, setReloading] = useState(false)
    const [query, setQuery] = useState("")

    // paginación simple (cliente)
    const [page, setPage] = useState(1)
    const pageSize = 8

    // dialog create/edit
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<Mode>("create")
    const [editingId, setEditingId] = useState<number | null>(null)

    // form state
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // delete confirm
    const [confirmId, setConfirmId] = useState<number | null>(null)

    // cargar tabla
    const load = async () => {
        try {
            setLoading(true)
            const data = await fetchNewsData()
            // ordenar por fecha desc
            data.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            setItems(data)
        } catch (e: any) {
            toast.error(e?.message || "No se pudieron cargar las novedades")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    // liberar URL del preview cuando cambie/cerremos
    useEffect(() => {
        return () => {
            if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
        }
    }, [preview])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return items
        return items.filter((n) => {
            return (
                n.title.toLowerCase().includes(q) ||
                n.content.toLowerCase().includes(q) ||
                (n.author?.name ?? "").toLowerCase().includes(q) ||
                (n.address?.street_address ?? "").toLowerCase().includes(q)
            )
        })
    }, [items, query])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paged = useMemo(() => {
        const start = (page - 1) * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, page])

    const resetForm = () => {
        setTitle("")
        setContent("")
        setImage(null)
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
        setPreview(null)
        setEditingId(null)
        setSubmitting(false)
    }

    const openCreate = () => {
        setMode("create")
        resetForm()
        setOpen(true)
    }

    const openEdit = async (id: number) => {
        try {
            setMode("edit")
            resetForm()
            setOpen(true)
            setEditingId(id)
            // precargar
            const n = await fetchNewsById(id)
            setTitle(n.title ?? "")
            setContent(n.content ?? "")
            setPreview(safeImg(n.src) || null)
        } catch (e: any) {
            toast.error(e?.message || "No se pudo cargar la noticia")
            setOpen(false)
        }
    }

    const onFile = (file?: File | null) => {
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)

        if (!file) {
            setImage(null)
            setPreview(null)
            return
        }
        if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
            toast.error("Formato no permitido. Usa jpeg, jpg, png o webp")
            return
        }
        const sizeMb = file.size / (1024 * 1024)
        if (sizeMb > MAX_MB) {
            toast.error("La imagen supera los 5 MB")
            return
        }
        setImage(file)
        setPreview(URL.createObjectURL(file))
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) {
            toast.error("Título y contenido son obligatorios")
            return
        }
        setSubmitting(true)
        try {
            if (mode === "create") {
                const payload: CreateNewsPayload = {
                    title: title.trim(),
                    content: content.trim(),
                    image,
                }
                await createNews(payload)
                toast.success("Noticia creada")
            } else if (mode === "edit" && editingId) {
                const payload: UpdateNewsPayload = {
                    id: editingId,
                    title: title.trim(),
                    content: content.trim(),
                    image: image ?? undefined, // si no se cambia, no enviamos
                }
                await updateNews(payload)
                toast.success("Noticia actualizada")
            }
            setOpen(false)
            resetForm()
            setReloading(true)
            await load()
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "No se pudo guardar la noticia"
            toast.error(msg)
        } finally {
            setSubmitting(false)
            setReloading(false)
        }
    }

    const confirmDelete = (id: number) => setConfirmId(id)

    const doDelete = async () => {
        if (!confirmId) return
        const id = confirmId
        setConfirmId(null)
        try {
            await deleteNews(id)
            toast.success("Noticia eliminada")
            setReloading(true)
            await load()
        } catch (e: any) {
            toast.error(e?.message || "No se pudo eliminar")
        } finally {
            setReloading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto w-full space-y-4">
            {/* Barra superior con Cerrar sesión */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Panel de Novedades</h2>
                <Button
                    variant="outline"
                    onClick={() => logout?.()}
                    className="gap-2"
                    title="Cerrar sesión"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </Button>
            </div>

            <Card className="w-full shadow-sm">
                <CardHeader className="flex items-center justify-between sm:flex-row gap-4">
                    <CardTitle className="text-xl font-semibold">
                        Administrar Novedades
                    </CardTitle>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título, autor, dirección…"
                                className="pl-8"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setPage(1)
                                }}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={load}
                            disabled={loading || reloading}
                            title="Refrescar"
                        >
                            {reloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-4 w-4" />
                            )}
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Tabla */}
                    <div className="w-full overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/60">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium">Portada</th>
                                    <th className="px-3 py-2 font-medium">Título</th>
                                    <th className="px-3 py-2 font-medium">Autor</th>
                                    <th className="px-3 py-2 font-medium">Dirección</th>
                                    <th className="px-3 py-2 font-medium">Fecha</th>
                                    <th className="px-3 py-2 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                            Cargando…
                                        </td>
                                    </tr>
                                ) : paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                            Sin resultados.
                                        </td>
                                    </tr>
                                ) : (
                                    paged.map((n) => (
                                        <tr key={n.id} className="border-t">
                                            <td className="px-3 py-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={safeImg(n.src) || "/placeholder/card.jpg"}
                                                    alt={n.title}
                                                    className="h-12 w-20 rounded object-cover border"
                                                    onError={(e) =>
                                                        ((e.currentTarget.src = "/placeholder/card.jpg"))
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium line-clamp-1">{n.title}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                    {n.content}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                        {(n.author?.name ?? "A")
                                                            .split(" ")
                                                            .map((p) => p[0])
                                                            .slice(0, 2)
                                                            .join("")
                                                            .toUpperCase()}
                                                    </div>
                                                    <span className="text-xs">
                                                        {n.author?.name ?? "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="text-xs">
                                                    {n.address?.street_address ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant="secondary">{timeAgo(n.created_at)}</Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => openEdit(n.id)}
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        onClick={() => confirmDelete(n.id)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} •
                            {" "}Página {page} de {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                </CardContent>

                {/* Dialog Create/Edit */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {mode === "create" ? "Crear noticia" : "Editar noticia"}
                            </DialogTitle>
                        </DialogHeader>
                        <Separator />

                        <form onSubmit={submit} className="space-y-4 pt-2">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej: Acto en el barrio…"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Contenido *</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={6}
                                    placeholder="Escribí la noticia…"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Imagen (jpeg, jpg, png, webp) — máx {MAX_MB}MB
                                </Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="file"
                                        accept={ACCEPTED.join(",")}
                                        onChange={(e) => {
                                            onFile(e.target.files?.[0] ?? null)
                                            // permitir re-subir el mismo archivo
                                            e.currentTarget.value = ""
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={() => onFile(null)}>
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                        Quitar
                                    </Button>
                                </div>
                                {preview && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={preview}
                                        alt="preview"
                                        className="mt-2 h-48 w-full rounded-md object-cover border"
                                    />
                                )}
                                {mode === "edit" && !preview && (
                                    <p className="text-xs text-muted-foreground">
                                        Si no seleccionás una imagen, se mantiene la actual.
                                    </p>
                                )}
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Guardando…
                                        </>
                                    ) : mode === "create" ? (
                                        "Crear"
                                    ) : (
                                        "Guardar cambios"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Confirmación de borrado */}
                <AlertDialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta noticia?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Esta acción no se puede deshacer.
                        </p>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={doDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Card>
        </div>
    )
}

// Alias para no romper imports previos con el nombre mal tipeado
export const AdrministrarNovedadesComponent = AdministrarNovedadesComponent
export default AdministrarNovedadesComponent
