export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-36" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 rounded-xl" />
      ))}
    </div>
  )
}
