export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 bg-gray-200 rounded-full w-24" />
        ))}
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-12 bg-gray-200 rounded-xl" />
      <div className="h-10 bg-gray-200 rounded-xl w-36" />
    </div>
  )
}
