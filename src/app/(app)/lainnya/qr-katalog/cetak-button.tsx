"use client";

export function CetakButton() {
  return (
    <button type="button" className="btn-primary w-full" onClick={() => window.print()}>
      🖨️ Cetak / simpan PDF
    </button>
  );
}
