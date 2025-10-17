// app/(lo-que-sea)/MapPersonas.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { fetchMapData } from "@/app/utils/MapHelper";
import { fetchNewsData, fetchNewsById, NewsItem } from "@/app/utils/NewsHelper";
import { fetchComercioData } from "@/app/utils/MapHelper";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, X } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Tipos locales
───────────────────────────────────────────────────────────── */
type Barrio = { id: number; name: string };

type Address = {
    id: number;
    street_address: string;
    barrio_id: string | number;
    latitude: number;
    longitude: number;
    barrio?: Barrio;
    visit?: boolean | number;
};

type Source = { id: number; name: string };

type RecordItem = {
    id: number;
    person_id: string;
    source_id: string;
    address_id: string;
    description?: string | null;
    source?: Source;
    address?: Address;
};

type Person = {
    id: number;
    dni: number;
    full_name: string;
    phone?: string | null;
    phones?: string[];
    records: RecordItem[];
};

type MarkerEntry = {
    key: string;
    lat: number;
    lng: number;
    person: Person;
    rec: RecordItem;
};

type GroupedMarker = {
    lat: number;
    lng: number;
    count: number;
    markers: MarkerEntry[];
};

const INITIAL_CENTER: [number, number] = [-27.795, -64.261];
const INITIAL_ZOOM = 12;

/* ────────────────────────────────────────────────────────────
   Utils
───────────────────────────────────────────────────────────── */
const timeAgo = (iso: string) => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `hace ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `hace ${hr}h`;
    const d = Math.floor(hr / 24);
    return `hace ${d}d`;
};

const safeImg = (src?: string | null) => {
    if (!src) return "";
    if (typeof window !== "undefined" && window.location.protocol === "https:" && src.startsWith("http://")) {
        return src.replace("http://", "https://");
    }
    return src;
};

const groupMarkersByLocation = (markers: MarkerEntry[], tolerance = 0.0001): GroupedMarker[] => {
    const groups = new Map<string, MarkerEntry[]>();
    markers.forEach((m) => {
        const lat = Math.round(m.lat / tolerance) * tolerance;
        const lng = Math.round(m.lng / tolerance) * tolerance;
        const k = `${lat},${lng}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(m);
    });
    return Array.from(groups.entries()).map(([key, markers]) => {
        const [lat, lng] = key.split(",").map(Number);
        return { lat, lng, count: markers.length, markers };
    });
};

/* ────────────────────────────────────────────────────────────
   Dialog de noticia
───────────────────────────────────────────────────────────── */
function NewsDialog({
    newsId,
    open,
    onOpenChange,
}: {
    newsId: number | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [item, setItem] = useState<NewsItem | null>(null);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    useEffect(() => {
        if (!open || !newsId) return;
        setLoading(true);
        setItem(null);
        (async () => {
            try {
                const data = await fetchNewsById(newsId);
                setItem(data);
            } catch (e) {
                console.error("Error loading news:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [open, newsId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl z-[10000]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {item?.title ?? (loading ? "Cargando…" : "Detalle de noticia")}
                    </DialogTitle>
                    {item && (
                        <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">{item.author?.name ?? "Autor"}</Badge>
                            <span>{formatDate(item.created_at)}</span>
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {item.address?.street_address ?? "Sin dirección"}
                            </span>
                        </DialogDescription>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="space-y-3">
                        <div className="h-64 w-full rounded-lg bg-muted animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                    </div>
                ) : item ? (
                    <div className="space-y-6">
                        {item.src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={safeImg(item.src) || "/placeholder/cover.jpg"}
                                alt={item.title}
                                className="w-full max-h-[600px] rounded-lg object-cover"
                                onError={(e) => ((e.currentTarget.src = "/placeholder/cover.jpg"))}
                            />
                        )}
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-destructive">No se pudo cargar la noticia</div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────── */
type SelectedGroup = {
    lat: number;
    lng: number;
    persons: { person: Person; records: RecordItem[] }[];
    newsBuckets: { personId: number; personName: string; news: NewsItem[] }[];
    totalNews: number;
};

export default function MapPersonas() {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const personMarkersRef = useRef<L.Marker[]>([]);
    const commerceMarkersRef = useRef<L.Marker[]>([]);

    const [data, setData] = useState<Person[] | null>(null);
    const [loading, setLoading] = useState(true);

    const [news, setNews] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsByPersonId, setNewsByPersonId] = useState<Record<number, NewsItem[]>>({});

    const [selected, setSelected] = useState<SelectedGroup | null>(null);
    const [newsDialogOpen, setNewsDialogOpen] = useState(false);
    const [currentNewsId, setCurrentNewsId] = useState<number | null>(null);

    const [comercios, setComercios] = useState<Comercio[]>([]);
    const [comerciosLoading, setComerciosLoading] = useState(true);

    const openNews = (id: number) => {
        setCurrentNewsId(id);
        setNewsDialogOpen(true);
    };

    /* Datos personas */
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchMapData();
                const arr: Person[] = Array.isArray(res) ? res : res ? [res] : [];
                setData(arr);
            } catch (error) {
                console.error("Error fetching map data:", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* Noticias */
    useEffect(() => {
        (async () => {
            try {
                const items = await fetchNewsData();
                setNews(items);
                const idx: Record<number, NewsItem[]> = {};
                for (const n of items) {
                    const pid = n?.person_record?.person_id;
                    if (typeof pid === "number") {
                        (idx[pid] ??= []).push(n);
                    }
                }
                Object.values(idx).forEach((arr) =>
                    arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                );
                setNewsByPersonId(idx);
            } catch (e) {
                console.error("Error fetching news:", e);
            } finally {
                setNewsLoading(false);
            }
        })();
    }, []);

    /* Comercios */
    useEffect(() => {
        (async () => {
            try {
                const list = await fetchComercioData();
                setComercios(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error("Error loading comercios:", e);
                setComercios([]);
            } finally {
                setComerciosLoading(false);
            }
        })();
    }, []);

    /* Markers personas agrupados */
    const personMarkers: MarkerEntry[] = useMemo(() => {
        if (!data) return [];
        const out: MarkerEntry[] = [];
        for (const person of data) {
            for (const rec of person.records || []) {
                const a = rec.address;
                if (!a || typeof a.latitude !== "number" || typeof a.longitude !== "number") continue;
                out.push({
                    key: `${person.id}-${rec.id}-${a.id}`,
                    lat: Number(a.latitude),
                    lng: Number(a.longitude),
                    person,
                    rec,
                });
            }
        }
        return out;
    }, [data]);

    const grouped = useMemo(() => groupMarkersByLocation(personMarkers), [personMarkers]);

    /* Iconos */
    const visitedIcon = useMemo(
        () =>
            L.icon({
                iconUrl: "/logos/visitados.png",
                iconRetinaUrl: "/logos/visitados.png",
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
                className: "person-marker visited",
            }),
        []
    );

    const notVisitedIcon = useMemo(
        () =>
            L.icon({
                iconUrl: "/logos/novisitados.png",
                iconRetinaUrl: "/logos/novisitados.png",
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
                className: "person-marker not-visited",
            }),
        []
    );

    const comercioIcon = useMemo(
        () =>
            L.icon({
                iconUrl: "/logos/negocios.png",
                iconRetinaUrl: "/logos/negocios.png",
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
                className: "comercio-marker",
            }),
        []
    );

    /* Inicializar mapa */
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || loading) return;

        const map = L.map(mapContainerRef.current).setView(INITIAL_CENTER, INITIAL_ZOOM);
        L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
            maxZoom: 20,
        }).addTo(map);
        mapRef.current = map;

        return () => {
            personMarkersRef.current.forEach((m) => m.remove());
            commerceMarkersRef.current.forEach((m) => m.remove());
            map.remove();
            mapRef.current = null;
        };
    }, [loading]);

    /* Pintar marcadores (personas + comercios) */
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // limpiar
        personMarkersRef.current.forEach((m) => m.remove());
        commerceMarkersRef.current.forEach((m) => m.remove());
        personMarkersRef.current = [];
        commerceMarkersRef.current = [];

        const bounds = L.latLngBounds([]);

        // Personas agrupadas
        grouped.forEach((g) => {
            bounds.extend([g.lat, g.lng]);
            const hasVisited = g.markers.some(
                (m) => m.rec.address?.visit === true || m.rec.address?.visit === 1
            );
            const icon = hasVisited ? visitedIcon : notVisitedIcon;
            const marker = L.marker([g.lat, g.lng], { icon }).addTo(map);

            marker.on("click", () => {
                const perMap = new Map<number, { person: Person; records: RecordItem[] }>();
                g.markers.forEach((m) => {
                    const prev = perMap.get(m.person.id);
                    if (prev) prev.records.push(m.rec);
                    else perMap.set(m.person.id, { person: m.person, records: [m.rec] });
                });

                const personsArr = Array.from(perMap.values());
                const newsBuckets = personsArr.map(({ person }) => ({
                    personId: person.id,
                    personName: person.full_name,
                    news: newsByPersonId[person.id] ?? [],
                }));
                const totalNews = newsBuckets.reduce((acc, b) => acc + b.news.length, 0);

                setSelected({
                    lat: g.lat,
                    lng: g.lng,
                    persons: personsArr,
                    newsBuckets,
                    totalNews,
                });
            });

            personMarkersRef.current.push(marker);
        });

        // Comercios 1:1 (sin agrupar)
        comercios.forEach((c) => {
            const lat = Number(c.latitud);
            const lng = Number(c.longitud);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            bounds.extend([lat, lng]);

            const marker = L.marker([lat, lng], { icon: comercioIcon, zIndexOffset: 500 })
                .addTo(map)
                .bindPopup(
                    `<div style="min-width:220px">
            <div style="font-weight:600">${c.nombre}</div>
            <div style="font-size:12px;opacity:.8">${c.direccion_original || "Dirección no informada"}</div>
            <div style="font-size:12px;opacity:.7;margin-top:4px">${c.ciudad || ""}</div>
          </div>`
                );

            commerceMarkersRef.current.push(marker);
        });

        if (bounds.isValid()) {
            if (grouped.length + comercios.length === 1) {
                map.setView(bounds.getCenter(), 15);
            } else {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [grouped, newsByPersonId, visitedIcon, notVisitedIcon, comercios, comercioIcon]);

    /* Render */
    return (
        <div className="w-full p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Mapa de Personas
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
                        {/* MAPA */}
                        <div className="w-full">
                            <div className="mb-2 flex items-center justify-between text-sm flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <span>
                                        Ubic. Personas: <Badge variant="outline">{grouped.length}</Badge>
                                    </span>
                                    <span>
                                        Comercios:{" "}
                                        <Badge variant="secondary">
                                            {comerciosLoading ? "…" : comercios.length}
                                        </Badge>
                                    </span>
                                </div>
                                <div className="text-muted-foreground text-xs">
                                    Novedades: {newsLoading ? "cargando..." : news.length}
                                </div>
                            </div>

                            <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-neutral-800 bg-black">
                                {loading ? (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        Cargando mapa...
                                    </div>
                                ) : (
                                    <div ref={mapContainerRef} className="w-full h-full" />
                                )}
                            </div>
                        </div>

                        {/* PANEL DERECHO */}
                        <aside className="h-[70vh] rounded-xl border bg-card overflow-y-auto pr-3 -mr-3">
                            {selected ? (
                                <div className="flex flex-col min-h-full">
                                    <div className="flex items-center justify-between p-4">
                                        <div className="space-y-1">
                                            {selected.persons.length === 1 ? (
                                                (() => {
                                                    const p = selected.persons[0].person;
                                                    const firstRec = selected.persons[0].records?.[0];
                                                    const addr = firstRec?.address;
                                                    const barrio = addr?.barrio?.name ?? "—";
                                                    const phone =
                                                        p.phone ??
                                                        (Array.isArray(p.phones) && p.phones.length > 0
                                                            ? p.phones[0]
                                                            : "—");
                                                    return (
                                                        <>
                                                            <div className="text-base font-semibold">{p.full_name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                <span className="font-medium">Dirección: </span>
                                                                {addr?.street_address ?? "—"}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                <span className="font-medium">Barrio: </span>
                                                                {barrio}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                <span className="font-medium">Teléfono: </span>
                                                                {phone}
                                                            </div>
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <>
                                                    <div className="text-sm text-muted-foreground">
                                                        {selected.persons.length} personas
                                                    </div>
                                                    <div className="text-base font-semibold">
                                                        Seleccioná una tarjeta para ver detalles
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelected(null)}
                                            title="Limpiar selección"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Separator />

                                    {selected.persons.length > 1 && (
                                        <>
                                            <div className="px-4 py-2 text-sm font-medium">
                                                Personas en esta ubicación
                                            </div>
                                            <div className="px-4 pb-2 space-y-2">
                                                {selected.persons.map(({ person, records }) => {
                                                    const addr = records?.[0]?.address;
                                                    const barrio = addr?.barrio?.name ?? "—";
                                                    const phone =
                                                        person.phone ??
                                                        (Array.isArray(person.phones) && person.phones.length > 0
                                                            ? person.phones[0]
                                                            : "—");
                                                    return (
                                                        <div key={person.id} className="rounded-lg border p-3">
                                                            <div className="text-sm font-semibold">
                                                                {person.full_name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                <span className="font-medium">Dirección: </span>
                                                                {addr?.street_address ?? "—"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                <span className="font-medium">Barrio: </span>
                                                                {barrio}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                <span className="font-medium">Teléfono: </span>
                                                                {phone}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <Separator className="my-2" />
                                        </>
                                    )}

                                    <div className="flex items-center justify-between px-4 py-2">
                                        <div className="text-sm font-medium">Novedades</div>
                                        <Badge variant="secondary">{selected.totalNews}</Badge>
                                    </div>

                                    <Separator />

                                    <div className="p-4 space-y-6">
                                        {selected.newsBuckets.every((b) => b.news.length === 0) ? (
                                            <div className="text-sm text-muted-foreground">
                                                Sin Novedades asociadas.
                                            </div>
                                        ) : (
                                            selected.newsBuckets.map((bucket) => (
                                                <div key={bucket.personId} className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm font-semibold">
                                                            {bucket.personName}
                                                        </div>
                                                        <Badge variant="outline">{bucket.news.length}</Badge>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {bucket.news.map((n) => {
                                                            const img = safeImg(n.src || "");
                                                            return (
                                                                <article
                                                                    key={n.id}
                                                                    className="overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                                                                    onClick={() => openNews(n.id)}
                                                                    title="Ver detalle"
                                                                >
                                                                    <div className="grid grid-cols-[112px_1fr] gap-3">
                                                                        <div className="relative h-28 w-full bg-muted">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={img || "/placeholder/card.jpg"}
                                                                                alt={n.title}
                                                                                className="h-full w-full object-cover"
                                                                                loading="lazy"
                                                                                referrerPolicy="no-referrer"
                                                                                onError={(e) =>
                                                                                    ((e.currentTarget.src = "/placeholder/card.jpg"))
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="pr-3 py-3">
                                                                            <h4 className="line-clamp-2 text-sm font-semibold leading-snug">
                                                                                {n.title}
                                                                            </h4>
                                                                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                                                {n.content}
                                                                            </p>
                                                                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                                                                <span>{timeAgo(n.created_at)}</span>
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    <MapPin className="h-3.5 w-3.5" />
                                                                                    {n.address?.street_address ??
                                                                                        "Ubicación no disponible"}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </article>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                                    <MapPin className="mb-2 h-5 w-5" />
                                    Hacé click en un marcador para ver la persona y sus Novedades aquí.
                                </div>
                            )}
                        </aside>
                    </div>
                </CardContent>
            </Card>

            <NewsDialog
                newsId={currentNewsId}
                open={newsDialogOpen}
                onOpenChange={(v) => setNewsDialogOpen(v)}
            />
        </div>
    );
}
