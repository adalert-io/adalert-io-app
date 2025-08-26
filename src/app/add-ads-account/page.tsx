import { Suspense } from "react";
import AddAdsAccountWrapper from "./AddAdsAccountWrapper";
import { Loader2 } from "lucide-react";

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex flex-1 items-center justify-center mt-24">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function AddAdsAccountPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AddAdsAccountWrapper />
    </Suspense>
  );
}
