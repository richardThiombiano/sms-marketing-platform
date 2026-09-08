import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
        <FileQuestion className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Page introuvable
        </h2>
        <p className="text-sm text-slate-400 max-w-md">
          La page d&apos;administration recherchée n&apos;existe pas.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/admin">Retour au panel admin</Link>
      </Button>
    </div>
  );
}
