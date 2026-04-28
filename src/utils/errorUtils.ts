/**
 * Extracts a human-readable message from various error types (Error objects, strings, IPC errors).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Handle Tauri/IPC specific error objects if they have a 'message' or 'error' field
    const err = error as any;
    if (err.message) return String(err.message);
    if (err.error) return String(err.error);
    
    // Check for JSON-stringified error objects
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error occurred';
    }
  }
  
  return error ? String(error) : 'An unknown error occurred';
}
