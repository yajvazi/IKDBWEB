"use client";

import { useState } from "react";
import { Copy, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";

type Props = {
  recordTitle: string;
  identifiers: Record<string, string | number | null>;
};

export function AdminDetailActions({ recordTitle, identifiers }: Props) {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  async function copyIdentifiers() {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(identifiers, null, 2));
      setStatus(`Copied safe identifiers for ${recordTitle}.`);
      showToast("Safe identifiers copied.", "success");
    } catch {
      setStatus(`Clipboard permission denied for ${recordTitle}.`);
      showToast("Clipboard permission denied.", "error");
    }
  }

  function queueRetry() {
    setStatus(`Queued retry workflow for ${recordTitle}.`);
    showToast(`Retry queued for ${recordTitle}.`, "success");
  }

  function addNote() {
    const note = `Follow-up note added ${new Date().toLocaleTimeString()}`;
    setNotes((current) => [note, ...current].slice(0, 3));
    setStatus(note);
    showToast("Internal note added.", "success");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyIdentifiers}>
          <Copy className="mr-2 h-4 w-4" />
          Copy safe identifiers
        </Button>
        <Button variant="outline" size="sm" onClick={queueRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Queue retry
        </Button>
        <Button size="sm" onClick={addNote}>
          <FileText className="mr-2 h-4 w-4" />
          Add note
        </Button>
      </div>
      {status ? <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-primary">{status}</div> : null}
      {notes.length > 0 ? (
        <div className="grid gap-1">
          {notes.map((note) => (
            <div key={note} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {note}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
