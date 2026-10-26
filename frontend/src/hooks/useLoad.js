import { useEffect, useState } from "react";
import { api, apiError } from "../app/api";

export function useLoad(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const response = await api.get(url);
      setData(response.data);
      setError("");
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [url]);

  return {
    data,
    loading,
    error,
    refresh: loadData,
    setData,
  };
}
