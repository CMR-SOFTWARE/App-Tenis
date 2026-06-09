"use client"

export default function TurnosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-gray-800 font-semibold">No se pudo cargar la agenda</p>
      <p className="text-gray-400 text-sm">
        {error.message ?? "Error de conexión. Verificá tu internet e intentá de nuevo."}
      </p>
      <button
        onClick={reset}
        className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
