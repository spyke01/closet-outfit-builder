"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-shell-content">
      <h1 className="font-display text-3xl">This page couldn’t load</h1>
      <p role="alert" className="my-4 text-muted-foreground">Check your connection and try again. You can also open another page.</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild><Link href="/today">Go to Today</Link></Button>
      </div>
    </div>
  );
}
