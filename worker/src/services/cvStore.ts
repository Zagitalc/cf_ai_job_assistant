// @ts-nocheck
const buildUrl = (path: string) => `https://cv-store.internal${path}`;

const parseResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : "CV store request failed.";
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).details = data;
    throw error;
  }

  return data;
};

export const saveCvDocument = async (env: any, userId: string, cvData: unknown) => {
  const stub = env.CV_STORE.getByName(userId);
  const response = await stub.fetch(buildUrl("/save"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cvData }),
  });

  return parseResponse(response);
};

export const loadCvDocument = async (env: any, userId: string) => {
  const stub = env.CV_STORE.getByName(userId);
  const response = await stub.fetch(buildUrl("/get"));
  return parseResponse(response);
};
