import { useQuery } from "@tanstack/react-query";
import api from "../api";

interface Summary {
  totalDebt: number;
  overdueAmount: number;
  totalPaid: number;
  invoiceCount: number;
}

export function useSummary() {
  return useQuery<Summary>({
    queryKey: ["client-summary"],
    queryFn: async () => {
      const { data } = await api.get("/client/summary");
      return data;
    },
  });
}
