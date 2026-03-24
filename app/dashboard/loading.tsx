export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded-xl" />
      <div className="h-4 w-48 bg-gray-100 rounded-lg" />
      <div className="h-14 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}
