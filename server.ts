import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const VALID_MESSAGE_TYPES = [
  "Job Application",
  "Referral Request",
  "Interview Follow-up",
  "Internship Request",
  "Thank-you After Interview",
] as const;

const VALID_PLATFORMS = ["Email", "LinkedIn"] as const;

type MessageType = (typeof VALID_MESSAGE_TYPES)[number];
type Platform = (typeof VALID_PLATFORMS)[number];

interface GenerateRequestBody {
  messageType?: string;
  recipient?: string;
  keyPoints?: string;
  platform?: string;
  previousMessage?: string;
  variationNumber?: number;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  retries = 2
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/generate-message", async (req, res) => {
    const body = (req.body || {}) as GenerateRequestBody;
    const messageType = body.messageType?.trim() as MessageType;
    const recipient = body.recipient?.trim() ?? "";
    const keyPoints = body.keyPoints?.trim() ?? "";
    const platform = body.platform?.trim() as Platform;
    const previousMessage = body.previousMessage?.trim() ?? "";
    const variationNumber = Number(body.variationNumber) || 1;

    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      res.status(400).json({ error: "Please select a valid message type." });
      return;
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      res.status(400).json({ error: "Please select Email or LinkedIn as the platform." });
      return;
    }

    if (!recipient) {
      res.status(400).json({ error: "Please enter the recipient's name or designation." });
      return;
    }

    if (!keyPoints) {
      res.status(400).json({ error: "Please enter 2 to 3 key points to include in the message." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(500).json({
        error:
          "GEMINI_API_KEY is not configured. Please add your Gemini API key in the Settings > Secrets panel.",
      });
      return;
    }

    const isLinkedIn = platform === "LinkedIn";

    const systemInstruction = isLinkedIn
      ? [
          "You are an expert career communications coach helping college students and job seekers write polished, polite, and professional LinkedIn outreach messages.",
          "Write a concise, natural, grammatically impeccable LinkedIn message addressed appropriately to the recipient.",
          "STRICT LENGTH REQUIREMENT: The generated LinkedIn message MUST be strictly under 300 characters total (including spaces, greeting, and sign-off). Aim for 210 to 285 characters so it fits comfortably inside a LinkedIn connection note.",
          "Do not include a subject line for LinkedIn (return an empty string for subject).",
          "Incorporate all provided key points naturally without sounding robotic or overly casual.",
        ].join(" ")
      : [
          "You are an expert career communications coach helping college students and job seekers write polished, polite, and professional emails to recruiters, HR managers, hiring leads, and professors.",
          "Generate a concise, compelling, professional Subject Line and a complete, well-structured Email Body.",
          "Include an appropriate salutation using the recipient information, clear opening context matching the message type, smooth integration of all key points, a polite closing call-to-action, and a professional sign-off with [Your Name].",
          "Maintain clear, respectful, grammatically accurate prose without clichés or fluff.",
        ].join(" ");

    const variationInstruction = previousMessage
      ? `\n\nRegeneration request (Variation #${variationNumber}): Write a fresh alternative version with noticeably different opening phrasing and sentence structure from this previous draft:\n"""\n${previousMessage}\n"""`
      : "";

    const userPrompt = `Write a professional ${platform} message for the following details:
- Message Type: ${messageType}
- Recipient: ${recipient}
- Key Points to Include:
${keyPoints}${variationInstruction}`;

    try {
      const response = await generateWithRetry(ai, {
        model: "gemini-4-hydrogen",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description:
                  "Concise professional email subject line. Empty string if platform is LinkedIn.",
              },
              message: {
                type: Type.STRING,
                description: isLinkedIn
                  ? "Complete professional LinkedIn message strictly under 300 characters."
                  : "Complete professional email body including greeting, body paragraphs, and sign-off.",
              },
            },
            required: ["subject", "message"],
          },
        },
      });

      const rawText = (response.text ?? "").trim();
      let parsed: { subject?: string; message?: string };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          error: "Received an unexpected response format from the AI model. Please try again.",
        });
        return;
      }

      let subject = (parsed.subject ?? "").trim();
      let message = (parsed.message ?? "").trim();

      if (!message) {
        res.status(502).json({
          error: "The AI model returned an empty message. Please try generating again.",
        });
        return;
      }

      if (isLinkedIn) {
        subject = "";
        if (message.length >= 300) {
          const shortenResp = await generateWithRetry(ai, {
            model: "gemini-4-hydrogen",
            contents: `Shorten this LinkedIn message so it is strictly under 285 characters (including spaces) while keeping it polite, complete, and preserving the key points:\n\n${message}`,
            config: {
              systemInstruction:
                "Return only the shortened LinkedIn message text as JSON with a single 'message' field. It MUST be strictly under 290 characters.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  message: { type: Type.STRING },
                },
                required: ["message"],
              },
            },
          });

          try {
            const shortened = JSON.parse((shortenResp.text ?? "").trim()) as {
              message?: string;
            };
            if (shortened.message && shortened.message.trim().length > 0) {
              message = shortened.message.trim();
            }
          } catch {
            // Fall through to safe boundary trim if JSON parse fails
          }

          if (message.length >= 300) {
            const clipped = message.slice(0, 296);
            const lastSpace = clipped.lastIndexOf(" ");
            message = (lastSpace > 200 ? clipped.slice(0, lastSpace) : clipped).trimEnd() + "...";
          }
        }
      }

      res.json({
        subject,
        message,
        platform,
        messageType,
        characterCount: message.length,
      });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const errMessage = err instanceof Error ? err.message : String(err);

      if (status === 400 || status === 403 || errMessage.includes("API_KEY_INVALID")) {
        res.status(401).json({
          error:
            "Your Gemini API key appears invalid or lacks permission. Please verify it in Settings > Secrets.",
        });
        return;
      }

      if (status === 429) {
        res.status(429).json({
          error: "Rate limit reached. Please wait a few seconds and try again.",
        });
        return;
      }

      res.status(500).json({
        error: "Failed to generate message with Gemini API. Please try again.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
