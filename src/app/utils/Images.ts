
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export function resolveNewsImageUrl(src?: string | null): string {
    if (!src) return "/placeholder/card.jpg"

    // Si viene relativa, prepend API
    const absolute = src.startsWith("http") ? src : `${API_URL}${src}`

    // Evitar mixed content cuando el site está en https
    if (typeof window !== "undefined" && window.location.protocol === "https:" && absolute.startsWith("http://")) {
        return absolute.replace("http://", "https://")
    }

    return absolute
}
