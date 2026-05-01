import LoadingSpinner from "@/components/shared/loading-spinner";

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );
}
