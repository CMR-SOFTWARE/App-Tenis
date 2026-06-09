export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-40" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl" />
      ))}
    </div>
  )
}
