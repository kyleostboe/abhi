import { PageLoading } from "@/components/page-loading"

/** The card has to exist while the route's data is in flight — see components/page-loading.tsx. */
export default function Loading() {
  return <PageLoading />
}
