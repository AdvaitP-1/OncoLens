/**
 * Categorize and format errors for user-friendly display.
 */
export function getErrorMessage(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (msg.includes("404") || msg.includes("not found")) {
    return context === "case"
      ? "Case not found. It may have been deleted or the link is invalid."
      : "Resource not found. Please try again.";
  }
  if (msg.includes("503") || msg.includes("unavailable")) {
    return "Service temporarily unavailable. Please try again in a moment.";
  }
  if (msg.includes("500") || msg.includes("Internal Server Error")) {
    return "Something went wrong on our end. Please try again. If the problem persists, contact support.";
  }
  if (msg.includes("400") || msg.includes("Bad Request") || msg.includes("required")) {
    return msg || "Invalid request. Please check your input and try again.";
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized")) {
    return "Authentication required. Please sign in and try again.";
  }

  return msg || "An unexpected error occurred. Please try again.";
}

export function getErrorAction(error: unknown): { label: string; onClick?: () => void } | null {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
    return { label: "Retry" };
  }
  if (msg.includes("503") || msg.includes("unavailable")) {
    return { label: "Retry" };
  }
  if (msg.includes("500")) {
    return { label: "Retry" };
  }

  return null;
}
