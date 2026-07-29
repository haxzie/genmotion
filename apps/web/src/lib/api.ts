const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Parsed error body, when the server sent one — quota rejections carry
     *  the limit that was hit, which the upgrade modal needs. */
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...rest,
    ...(json !== undefined && {
      method: rest.method ?? "POST",
      headers: { "Content-Type": "application/json", ...rest.headers },
      body: JSON.stringify(json),
    }),
  });
  if (!res.ok) {
    let message = res.statusText;
    let body: unknown;
    try {
      body = await res.json();
      const error = (body as { error?: string })?.error;
      if (error) message = error;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, body);
  }
  return res.json() as Promise<T>;
}

export { API_URL };
