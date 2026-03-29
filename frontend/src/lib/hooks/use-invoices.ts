import { useQuery } from "@tanstack/react-query";
import api from "../api";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  eInvoiceStatus: string | null;
}

export interface InvoiceDetail extends Invoice {
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }[];
}

export function useInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ["client-invoices"],
    queryFn: async () => {
      const { data } = await api.get("/client/invoices");
      return data;
    },
  });
}

export function useInvoiceDetail(id: string | null) {
  return useQuery<InvoiceDetail>({
    queryKey: ["client-invoice", id],
    queryFn: async () => {
      const { data } = await api.get(`/client/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
