// app/unauthorized/page.tsx
import Link from "next/link"
import { cookies } from "next/headers"

const HOME_BY_ROLE: Record<string, string> = {
  admin: "/map",
  user: "/administrar-novedades",
}

export default function UnauthorizedPage() {
  const role = cookies().get("role")?.value?.toLowerCase() || ""
  const home = HOME_BY_ROLE[role] || "/"

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border p-8 text-center bg-white">
        <h1 className="text-2xl font-bold mb-2">No estás autorizado</h1>
        <p className="text-gray-600 mb-6">No tenés permisos para acceder a esta sección.</p>
        <Link href={home} className="inline-flex rounded-md px-4 py-2 bg-blue-600 text-white">
          Ir a mi inicio
        </Link>
        <p className="text-xs text-gray-400 mt-6">Rol actual: {role || "desconocido"}</p>
      </div>
    </main>
  )
}
