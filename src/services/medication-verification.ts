import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";

const metroHost = Constants.expoConfig?.hostUri?.replace(/:\d+$/, "");
// const defaultApiBaseUrl = metroHost ? `http://${metroHost}:3000` : 'http://localhost:3000';
const defaultApiBaseUrl = "https://unibrige-be-production.up.railway.app";

const API_BASE_URL = defaultApiBaseUrl;
const VERIFICATION_TIMEOUT_MS = 15_000;

export type VerificationConfidence = "high" | "medium" | "low";

export interface MedicationVerificationResult {
  containsMedication: boolean;
  confidence: VerificationConfidence;
}

interface VerificationResponse {
  contains_medication?: unknown;
  containsMedication?: unknown;
  confidence?: unknown;
}

export class MedicationVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MedicationVerificationError";
  }
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const rawBody = await response.text().catch(() => "");
  if (!rawBody) return `Verification API returned status ${response.status}.`;

  try {
    const parsed = JSON.parse(rawBody) as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };
    const detail = parsed.detail ?? parsed.error ?? parsed.message ?? parsed;
    const serialized =
      typeof detail === "string" ? detail : JSON.stringify(detail);
    return `Verification API returned status ${response.status}: ${serialized.slice(0, 500)}`;
  } catch {
    return `Verification API returned status ${response.status}: ${rawBody.slice(0, 500)}`;
  }
}

export async function verifyMedicationPhoto(
  photoUri: string,
): Promise<MedicationVerificationResult> {
  console.log("[MedicationVerification] reading photo:", photoUri);

  const base64Image = await FileSystem.readAsStringAsync(photoUri, {
    encoding: "base64",
  });

  console.log("[MedicationVerification] base64 length:", base64Image.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    VERIFICATION_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_BASE_URL}/verify-medication`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new MedicationVerificationError(await getApiErrorMessage(response));
    }

    const data = (await response.json()) as VerificationResponse;
    const containsMedication =
      data.contains_medication ?? data.containsMedication;
    const confidence = data.confidence;

    console.log("[MedicationVerification] result:", {
      containsMedication,
      confidence,
    });

    if (
      typeof containsMedication !== "boolean" ||
      (confidence !== "high" && confidence !== "medium" && confidence !== "low")
    ) {
      throw new MedicationVerificationError(
        "Verification API returned an invalid response.",
      );
    }

    return {
      containsMedication,
      confidence,
    };
  } catch (error) {
    if (error instanceof MedicationVerificationError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new MedicationVerificationError(
        "Medication verification timed out.",
      );
    }
    throw new MedicationVerificationError(
      "Unable to reach the medication verification API.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
