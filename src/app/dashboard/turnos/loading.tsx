export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-9 bg-gray-200 rounded w-32" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 rounded" />
        ))}
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, j) => (
            <div key={j} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}
