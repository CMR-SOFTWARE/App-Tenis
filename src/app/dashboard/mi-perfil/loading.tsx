export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse max-w-lg">
      <div className="h-7 bg-gray-200 rounded w-36" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      ))}
      <div className="h-10 bg-gray-200 rounded-lg w-32" />
    </div>
  )
}
