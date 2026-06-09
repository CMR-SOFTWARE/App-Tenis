export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-gray-200 rounded w-32" />
        <div className="h-9 bg-gray-200 rounded w-36" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
      ))}
    </div>
  )
}
