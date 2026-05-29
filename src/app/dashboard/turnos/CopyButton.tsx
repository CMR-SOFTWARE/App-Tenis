"use client"

import { useState } from "react"

export default function CopyButton({ text }: { text: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(text)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <button
      onClick={copiar}
      className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap ${
        copiado
          ? "bg-green-700 text-white"
          : "bg-white border border-green-300 text-green-700 hover:bg-green-50"
      }`}
    >
      {copiado ? "¡Copiado!" : "Copiar link"}
    </button>
  )
}
