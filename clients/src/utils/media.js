import { api } from "../api/api";

function getApiOrigin() {
  const base = api.defaults.baseURL || "";

  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

export function buildImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  const origin = getApiOrigin();
  return origin ? `${origin}${imageUrl}` : imageUrl;
}
