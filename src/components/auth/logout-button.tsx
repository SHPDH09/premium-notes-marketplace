"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "sidebar" | "ghost";
  className?: string;
  callbackUrl?: string;
};

export function LogoutButton({
  variant = "default",
  className,
  callbackUrl = "/",
}: Props) {
  async function logout() {
    await signOut({ callbackUrl });
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={() => void logout()}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700",
          className
        )}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant === "ghost" ? "ghost" : "outline"}
      size="sm"
      className={className}
      onClick={() => void logout()}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
