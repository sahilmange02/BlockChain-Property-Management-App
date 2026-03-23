import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { propertyApi } from "../api/property.api";
import PropertyCard from "../components/common/PropertyCard";
import type { Property } from "../types";

export default function PropertyListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [searchSurveyNumber, setSearchSurveyNumber] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Property | null>(null);

  const listQuery = useQuery({
    queryKey: ["properties", { page, status, type, city }],
    queryFn: () =>
      propertyApi.getAll({
        page,
        limit: 10,
        status: status || undefined,
        type: type || undefined,
        city: city || undefined,
      }),
  });

  const properties = listQuery.data?.properties || [];
  const totalPages = listQuery.data?.pages || 1;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const filtersSummary = useMemo(() => {
    const parts: string[] = [];
    if (status) parts.push(`Status: ${status}`);
    if (type) parts.push(`Type: ${type}`);
    if (city) parts.push(`City: ${city}`);
    return parts.join(" • ");
  }, [status, type, city]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchResult(null);
    if (!searchSurveyNumber.trim()) return;
    try {
      const res = await propertyApi.search(searchSurveyNumber.trim());
      setSearchResult(res.property);
    } catch {
      setSearchResult(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-gray-400 mt-1">
            {filtersSummary ? filtersSummary : "Browse all registered properties"}.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex gap-3 flex-wrap">
          <input
            value={searchSurveyNumber}
            onChange={(e) => setSearchSurveyNumber(e.target.value)}
            className="flex-1 input-field"
            placeholder="Search by Survey Number (e.g. MH/GK/2025/001)"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Search
          </button>
        </div>
      </form>

      {searchResult ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-white">Search Result</h2>
          <PropertyCard property={searchResult} />
        </div>
      ) : null}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
            <option value="">All Status</option>
            <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="TRANSFER_PENDING">TRANSFER_PENDING</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
            <option value="">All Types</option>
            <option value="RESIDENTIAL">RESIDENTIAL</option>
            <option value="COMMERCIAL">COMMERCIAL</option>
            <option value="AGRICULTURAL">AGRICULTURAL</option>
            <option value="INDUSTRIAL">INDUSTRIAL</option>
          </select>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
            placeholder="City (e.g. Mumbai)"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              listQuery.refetch();
            }}
            className="btn-secondary"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setType("");
              setCity("");
              setPage(1);
              setSearchResult(null);
              listQuery.refetch();
            }}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : listQuery.error ? (
        <div className="text-red-400">Failed to load properties.</div>
      ) : properties.length === 0 ? (
        <div className="text-gray-500">No properties match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.blockchainPropertyId} property={p} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary disabled:opacity-50">
          Prev
        </button>
        <div className="text-gray-400 text-sm">
          Page {page} of {totalPages}
        </div>
        <button disabled={!canNext} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-secondary disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
}

