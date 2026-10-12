import type { MetadataRoute } from "next";

// The /sign/{token} links are private, single-use links shared directly with
// clients by email — they must never be crawled or indexed by search
// engines. The rest of the app sits behind normal application access, but is
// excluded too since none of it is meant to be publicly discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
