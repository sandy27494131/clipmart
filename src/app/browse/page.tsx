import { Suspense } from "react";
import BrowsePageClient from "./BrowsePageClient";
import BrowseSkeleton from "./BrowseSkeleton";

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowsePageClient />
    </Suspense>
  );
}
