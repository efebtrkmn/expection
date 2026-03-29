import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency as TRY */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format date to TR locale */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Invoice status labels in Turkish */
export const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  ISSUED: "Kesildi",
  SENT: "Gönderildi",
  PARTIALLY_PAID: "Kısmi Ödeme",
  PAID: "Ödendi",
  OVERDUE: "Vadesi Geçmiş",
  CANCELLED: "İptal",
};

/** Map status to badge CSS class */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "PAID":
      return "badge-success";
    case "OVERDUE":
      return "badge-danger";
    case "CANCELLED":
      return "badge-neutral";
    case "DRAFT":
      return "badge-warning";
    default:
      return "badge-info";
  }
}
