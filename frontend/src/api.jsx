const URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, method = "GET", body) {
  const res = await fetch(URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") || "",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
