type SharePort = Pick<Navigator, "share" | "clipboard">;

export type MatchShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Use the native mobile share sheet when available, with a clipboard fallback. */
export function matchCardUrl(locationLike: Pick<Location, "origin"> | undefined = typeof location === "undefined" ? undefined : location): string | undefined {
  return locationLike?.origin || undefined;
}

export async function shareMatchCard(text: string, port: SharePort = navigator, url = matchCardUrl()): Promise<MatchShareResult> {
  if (port.share) {
    try {
      await port.share({ title: "Spider Fight", text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      return "failed";
    }
  }
  try {
    await port.clipboard.writeText(url ? `${text}\n${url}` : text);
    return "copied";
  } catch {
    return "failed";
  }
}
