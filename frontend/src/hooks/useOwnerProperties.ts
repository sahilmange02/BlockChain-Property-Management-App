import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { Property } from "@/types";

interface OwnerPropertiesResponse {
  properties: Property[];
  total: number;
  page: number;
  pages: number;
}

export function useOwnerProperties(walletAddress: string | null, page = 1) {
  return useQuery({
    queryKey: ["owner-properties", walletAddress, page],
    queryFn: async () => {
      const { data } = await api.get<OwnerPropertiesResponse>(
        `/properties/owner/${walletAddress}?page=${page}`
      );
      return data;
    },
    enabled: !!walletAddress,
  });
}
