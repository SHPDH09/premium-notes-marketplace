"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PrintingQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    void fetch("/api/admin/printing-queue")
      .then((r) => r.json())
      .then((d) => setQueue(d.queue ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Printing Queue</h1>
      {queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Your printing queue is empty.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((j) => (
            <Card key={j.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-mono font-semibold">{j.orderNumber}</p>
                  <p>{j.student}</p>
                  <p className="text-slate-500">
                    {j.items[0]?.documentName} × {j.items[0]?.quantity} · {j.status}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/admin/physical-orders/${j.orderId}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
