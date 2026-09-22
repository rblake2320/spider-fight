type SharePort = Pick<Navigator, "share" | "clipboard">;

export type MatchShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Use the native mobile share sheet when available, with a clipboard fallback. */
export async function shareMatchCard(text: string, port: SharePort = navigator): Promise<MatchShareResult> {
  if (port.share) {
    try {
      await port.share({ title: "Spider Fight", text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      return "failed";
    }
  }
  try {
    await port.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
