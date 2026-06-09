export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 rounded-full w-28" />
        <div className="h-9 bg-gray-200 rounded-full w-28" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
      ))}
    </div>
  )
}
