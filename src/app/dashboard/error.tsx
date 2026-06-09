"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-red-500 text-xl">!</span>
      </div>
      <div>
        <p className="text-gray-800 font-semibold">Ocurrió un error al cargar los datos</p>
        <p className="text-gray-400 text-sm mt-1">
          {error.message ?? "Algo salió mal. Podés intentar recargar."}
        </p>
      </div>
      <button
        onClick={reset}
        className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
