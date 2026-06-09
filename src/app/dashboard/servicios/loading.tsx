export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-36" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 rounded-xl" />
      ))}
      <div className="h-px bg-gray-200 my-4" />
      <div className="h-7 bg-gray-200 rounded w-44" />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 rounded-xl" />
      ))}
    </div>
  )
}
