"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { initializarSlots } from "./actions"

export default function TurnosInitWrapper() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [estado, setEstado] = useState<"inicializando" | "error" | null>("inicializando")

  useEffect(() => {
    startTransition(async () => {
      const result = await initializarSlots()
      if (result.ok) {
        router.refresh()
      } else {
        setEstado("error")
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (estado === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 text-sm font-semibold">No se pudo configurar la agenda.</p>
        <button
          onClick={() => router.refresh()}
          className="mt-3 text-xs text-red-600 underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center animate-pulse">
      <p className="text-gray-500 text-sm">Configurando tu agenda por primera vez...</p>
    </div>
  )
}
