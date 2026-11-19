import React, { useState } from "react";
import {
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Mail,
  Linkedin,
  RefreshCw,
  Send,
  RotateCcw,
} from "lucide-react";

type MessageType =
  | "Job Application"
  | "Referral Request"
  | "Interview Follow-up"
  | "Internship Request"
  | "Thank-you After Interview";

type Platform = "Email" | "LinkedIn";

interface GeneratedResult {
  subject: string;
  message: string;
  platform: Platform;
  messageType: MessageType;
  characterCount: number;
}

interface SamplePreset {
  label: string;
  messageType: MessageType;
  platform: Platform;
  recipient: string;
  keyPoints: string;
}

const MESSAGE_TYPES: MessageType[] = [
  "Job Application",
  "Referral Request",
  "Interview Follow-up",
  "Internship Request",
  "Thank-you After Interview",
];

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    label: "Software Internship Email",
    messageType: "Internship Request",
    platform: "Email",
    recipient: "Priya Nair, University Recruiter at CloudScale Labs",
    keyPoints:
      "• Final-year B.Tech Computer Science student (8.9 CGPA)\n• Built a full-stack task scheduler using React, Python, and PostgreSQL\n• Available for a 6-month Summer/Spring Software Engineering internship",
  },
  {
    label: "Alumni Referral (LinkedIn)",
    messageType: "Referral Request",
    platform: "LinkedIn",
    recipient: "Rahul Verma, Senior Software Engineer at FinCore",
    keyPoints:
      "• B.Tech CSE senior from your alma mater\n• Applying for the Graduate Backend Engineer role (Job ID #4821)\n• Strong experience in Python, REST APIs, and distributed caching",
  },
  {
    label: "Post-Interview Thank-You",
    messageType: "Thank-you After Interview",
    platform: "Email",
    recipient: "Dr. Ananya Sen, Applied AI Lead at VisionWorks",
    keyPoints:
      "• Thank you for discussing the ML Intern role and the computer vision pipeline earlier today\n• Especially enjoyed learning about your model evaluation workflow\n• Looking forward to next steps and happy to share my GitHub benchmarks",
  },
];

export default function App() {
  const [messageType, setMessageType] = useState<MessageType>("Internship Request");
  const [platform, setPlatform] = useState<Platform>("Email");
  const [recipient, setRecipient] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<string>("");

  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"all" | "subject" | null>(null);
  const [variationCount, setVariationCount] = useState<number>(1);

  const handleLoadSample = (preset: SamplePreset) => {
    setMessageType(preset.messageType);
    setPlatform(preset.platform);
    setRecipient(preset.recipient);
    setKeyPoints(preset.keyPoints);
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  const handleReset = () => {
    setMessageType("Internship Request");
    setPlatform("Email");
    setRecipient("");
    setKeyPoints("");
    setResult(null);
    setErrorMessage(null);
    setSuccessNotice(null);
    setVariationCount(1);
  };

  const requestGeneration = async (isRegenerate: boolean) => {
    if (!recipient.trim()) {
      setErrorMessage("Please enter the recipient's name or designation.");
      return;
    }
    if (!keyPoints.trim()) {
      setErrorMessage("Please provide 2 to 3 key points to include in your message.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    const nextVariation = isRegenerate ? variationCount + 1 : 1;

    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType,
          recipient: recipient.trim(),
          keyPoints: keyPoints.trim(),
          platform,
          previousMessage: isRegenerate && result ? result.message : undefined,
          variationNumber: nextVariation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error || "Unable to generate message. Please try again.");
        return;
      }

      setResult(data as GeneratedResult);
      setVariationCount(nextVariation);
      setSuccessNotice(
        isRegenerate
          ? `New ${data.platform} variation generated successfully.`
          : `Professional ${data.platform} message generated successfully.`
      );
    } catch {
      setErrorMessage("Network error while reaching the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void requestGeneration(false);
  };

  const handleCopy = async (target: "all" | "subject") => {
    if (!result) return;

    const textToCopy =
      target === "subject"
        ? result.subject
        : result.platform === "Email" && result.subject
        ? `Subject: ${result.subject}\n\n${result.message}`
        : result.message;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedField(target);
      window.setTimeout(() => {
        setCopiedField((current) => (current === target ? null : current));
      }, 2000);
    } catch {
      setErrorMessage("Clipboard access was blocked by the browser. Please copy manually.");
    }
  };

  const isLinkedInOutput = result?.platform === "LinkedIn";
  const charCount = result?.message.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar: 3-zone contract */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#compose"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            style={{ fontFamily: "var(--font-display)" }}
          >
            CareerDraft
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#compose"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Compose
            </a>
            <a
              href="#samples"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sample Prompts
            </a>
            <a
              href="#guidelines"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Writing Tips
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_PRESETS[0])}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Load Sample
            </button>
          </div>
        </div>
      </header>

      <main id="compose" className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 md:py-10">
        {/* Title & Short Description */}
        <section className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AI Professional Email &amp; LinkedIn Message Writer
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl leading-relaxed">
            Turn rough notes into clear, polite, and personalized outreach messages for recruiters,
            HR teams, alumni, and professors.
          </p>
        </section>

        {/* Main 2-Column Workspace */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean Input Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Message Details</h2>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>

            {/* 1. Message Type */}
            <div>
              <label
                htmlFor="message-type"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Message Type
              </label>
              <select
                id="message-type"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as MessageType)}
                className="w-full h-11 px-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
              >
                {MESSAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Platform Segmented Control */}
            <div>
              <span className="block text-sm font-medium text-slate-800 mb-1.5">Platform</span>
              <div
                role="radiogroup"
                aria-label="Target platform"
                className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={platform === "Email"}
                  onClick={() => setPlatform("Email")}
                  className={`flex items-center justify-center gap-2 h-10 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    platform === "Email"
                      ? "bg-white text-blue-700 border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Email
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={platform === "LinkedIn"}
                  onClick={() => setPlatform("LinkedIn")}
                  className={`flex items-center justify-center gap-2 h-10 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    platform === "LinkedIn"
                      ? "bg-white text-blue-700 border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Linkedin className="w-4 h-4" aria-hidden="true" />
                  LinkedIn
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {platform === "Email"
                  ? "Generates a subject line and complete professional email body."
                  : "Generates a concise outreach note strictly under 300 characters."}
              </p>
            </div>

            {/* 3. Recipient */}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-slate-800 mb-1.5">
                Recipient
              </label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g., Priya Sharma, Technical Recruiter at Infosys"
                className="w-full h-11 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
              />
            </div>

            {/* 4. Key Points */}
            <div>
              <label
                htmlFor="key-points"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Key Points (2–3 points)
              </label>
              <textarea
                id="key-points"
                rows={5}
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={
                  "• Final-year B.Tech AI & Data Science student\n• Built a resume parser using Python and NLP\n• Interested in Summer 2027 Software Intern role"
                }
                className="w-full p-3.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow leading-relaxed resize-y"
              />
            </div>

            {/* Generate CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Generating Message...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Generate Message
                </>
              )}
            </button>
          </form>

          {/* Right Column: AI-Generated Output */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 min-h-[460px] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Generated Message</h2>
                {result && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {result.platform}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    {result.messageType}
                  </p>
                )}
              </div>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy("all")}
                    className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedField === "all" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy Message
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void requestGeneration(true)}
                    className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                    Regenerate
                  </button>
                </div>
              )}
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Banner */}
            {successNotice && !errorMessage && (
              <div
                role="status"
                className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm text-emerald-800"
              >
                <Check className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="mt-6 space-y-4 flex-1" aria-busy="true" aria-label="Generating message">
                {platform === "Email" && (
                  <div className="space-y-2">
                    <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                  </div>
                )}
                <div className="space-y-2.5 pt-1">
                  <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-11/12 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            )}

            {/* Populated Output */}
            {!isLoading && result && (
              <div className="mt-5 space-y-5 flex-1 flex flex-col">
                {result.platform === "Email" && result.subject && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-500">Subject Line</span>
                      <button
                        type="button"
                        onClick={() => void handleCopy("subject")}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        {copiedField === "subject" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                            Copied subject
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            Copy subject
                          </>
                        )}
                      </button>
                    </div>
                    <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900">
                      {result.subject}
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500">
                      {isLinkedInOutput ? "LinkedIn Message" : "Email Body"}
                    </span>

                    {isLinkedInOutput && (
                      <span
                        className={`text-xs font-mono tabular-nums font-medium ${
                          charCount < 300 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {charCount} / 300 characters
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {result.message}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                  {platform === "Email" ? (
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Linkedin className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Ready to draft your {platform} message
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 max-w-md leading-relaxed">
                  Select a message type, enter your recipient and 2–3 key points on the left, then
                  click <span className="font-medium text-slate-700">Generate Message</span>.
                </p>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_PRESETS[0])}
                  className="mt-5 h-10 px-4 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Try with Sample Input
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Quick Sample Scenarios */}
        <section id="samples" className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sample Scenarios</h2>
              <p className="text-sm text-slate-600">
                Click any scenario to fill the form and test different message types.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleLoadSample(preset)}
                className="text-left p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="text-xs text-slate-500 mb-1">
                  {preset.platform}
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  {preset.messageType}
                </div>
                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {preset.label}
                </div>
                <p className="mt-1 text-xs text-slate-600 truncate">{preset.recipient}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Writing Guidelines */}
        <section id="guidelines" className="mt-10 pt-8 border-t border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Tips for Better Outreach Messages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">01. Include Specific Context</h3>
              <p>
                Mention the exact role title, job ID, or research topic alongside the recipient’s
                role so the opening line reads tailored rather than generic.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">02. Quantify Key Points</h3>
              <p>
                Add concrete details like your degree, CGPA, tech stack, or measurable project
                outcomes in 2–3 crisp bullet points.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">03. Keep LinkedIn Under 300</h3>
              <p>
                LinkedIn connection invitations limit notes to 300 characters. Use LinkedIn mode to
                automatically fit your pitch inside that limit.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
