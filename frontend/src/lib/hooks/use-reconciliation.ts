import { useQuery } from "@tanstack/react-query";
import api from "../api";

export interface ReconciliationVerify {
  statement: {
    generatedAt: string;
    invoiceCount: number;
    totalDebt: number;
    invoices: {
      invoiceNumber: string;
      issueDate: string;
      dueDate: string | null;
      totalAmount: number;
      status: string;
    }[];
  };
  customerSupplierId: string;
  expiresAt: string;
  expiresInHours: number;
}

export function useReconciliationVerify(token: string | null) {
  return useQuery<ReconciliationVerify>({
    queryKey: ["reconciliation-verify", token],
    queryFn: async () => {
      const { data } = await api.get(`/reconciliation/verify?token=${token}`);
      return data;
    },
    enabled: !!token,
    retry: false,
  });
}
