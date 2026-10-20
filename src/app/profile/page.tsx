"use client";

import { useEffect, useState } from "react";
import { StudentShell } from "@/components/layout/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BrandLoading } from "@/components/brand/brand-loading";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetch("/api/student/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.user ?? {}))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        profileImage: profile.profileImage,
      }),
    });
    if (!res.ok) return toast.error("Update failed");
    toast.success("Profile updated");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/student/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwd),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Password change failed");
    toast.success("Password changed successfully.");
    setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <StudentShell>
      {loading ? (
        <BrandLoading fullPage message="Loading profile…" />
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile.email ?? ""} disabled />
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
              <Button type="submit">Save Profile</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={pwd.confirmPassword}
                  onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <Button type="submit">Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      )}
    </StudentShell>
  );
}
