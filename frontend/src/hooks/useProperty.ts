import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useWeb3 } from "@/context/Web3Context";
import type { Property } from "@/types";

interface PropertyResponse {
  property: Property;
  onChain?: Record<string, unknown>;
}

export function useProperty(propertyId: number | null, verifyOnChain = true) {
  const { contract } = useWeb3();

  const query = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data } = await api.get<{ property: Property; onChain?: Record<string, unknown> }>(
        `/properties/${propertyId}`
      );
      return data;
    },
    enabled: !!propertyId,
  });

  const onChainData = verifyOnChain && contract && query.data?.property ? null : null;

  return {
    property: query.data?.property ?? null,
    onChainData: query.data?.onChain ?? onChainData,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
