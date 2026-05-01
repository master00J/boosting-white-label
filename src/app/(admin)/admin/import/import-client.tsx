"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";

type ImportRow = {
  customer_email: string;
  game: string;
  service: string;
  total: number;
  status?: string;
  notes?: string;
};

type ImportResult = {
  success: number;
  errors: Array<{ row: number; message: string }>;
};

const EXAMPLE_CSV = `customer_email,game,service,total,status,notes
customer@example.com,League of Legends,Rank Boost,29.99,completed,Imported
customer2@example.com,Valorant,Placement Matches,19.99,queued,`;

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return {
        customer_email: row.customer_email ?? "",
        game: row.game ?? "",
        service: row.service ?? "",
        total: parseFloat(row.total ?? "0"),
        status: row.status || "queued",
        notes: row.notes || undefined,
      };
    }).filter((r) => r.customer_email && r.game && r.service);
  };

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target?.result as string);
        setPreview(rows.slice(0, 5));
      } catch {
        setError("Invalid CSV file");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadExample = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-example.csv";
    a.click();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
          <h1 className="font-heading text-2xl font-semibold">Bulk import</h1>
        </div>
        <button onClick={downloadExample} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm hover:bg-[var(--bg-elevated)] transition-colors">
          <Download className="h-4 w-4" /> Example CSV
        </button>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className="p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] hover:border-primary/50 transition-colors cursor-pointer text-center"
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-[var(--text-muted)]" />
        {file ? (
          <div>
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{(file.size / 1024).toFixed(1)} KB · {preview.length}+ rows</p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-sm">Drag a CSV file here</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm mb-3">Preview (first {preview.length} rows)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {["Email", "Game", "Service", "Amount", "Status"].map((h) => (
                    <th key={h} className="text-left text-[var(--text-muted)] pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border-default)] last:border-0">
                    <td className="py-2 pr-4">{row.customer_email}</td>
                    <td className="py-2 pr-4">{row.game}</td>
                    <td className="py-2 pr-4">{row.service}</td>
                    <td className="py-2 pr-4">\${row.total.toFixed(2)}</td>
                    <td className="py-2 pr-4">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV format */}
      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-[var(--text-muted)]" />
          <p className="text-xs font-semibold">Required columns</p>
        </div>
        <code className="text-xs text-[var(--text-muted)]">customer_email, game, service, total, status (optioneel), notes (optioneel)</code>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-xl border ${result.errors.length === 0 ? "bg-green-400/10 border-green-400/20" : "bg-amber-400/10 border-amber-400/20"}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className={`h-4 w-4 ${result.errors.length === 0 ? "text-green-400" : "text-amber-400"}`} />
            <p className="text-sm font-medium">{result.success} orders imported{result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}</p>
          </div>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400">Row {e.row}: {e.message}</p>
          ))}
        </div>
      )}

      {file && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? "Importing..." : `Import ${preview.length}+ orders`}
        </button>
      )}
    </div>
  );
}
