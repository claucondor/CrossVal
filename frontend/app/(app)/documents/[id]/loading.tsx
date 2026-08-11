import Skeleton from "../../../../components/Skeleton";

export default function Loading() {
  return (
    <div
      className="p-6 flex flex-col gap-6 max-w-4xl"
      aria-label="Loading document"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="flex items-center justify-end">
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
