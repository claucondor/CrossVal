import Skeleton from "../../../components/Skeleton";

export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl" aria-label="Loading report">
      <Skeleton className="h-7 w-24" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-40 w-full max-w-md" />
    </div>
  );
}