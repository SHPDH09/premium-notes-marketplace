"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any>({});

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.user ?? {}));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) return toast.error("Update failed");
    toast.success("Profile updated");
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Admin Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div>
            <Label>Profile Image URL</Label>
            <Input
              value={profile.profileImage ?? ""}
              onChange={(e) => setProfile({ ...profile, profileImage: e.target.value })}
            />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
