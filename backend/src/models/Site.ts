import mongoose, { Schema, models, model } from "mongoose";

// --- Sub-types for each feature's stored output -----------------------

export interface ICrawledPage {
  url: string;
  title: string;
  headings: string[];
  textContent: string; // trimmed content used for chunking/embeddings
  links: string[];
  isHomepage: boolean;
}

export interface IContactInfo {
  emails: string[];
  phones: string[];
  socialLinks: string[];
  address?: string;
}

export interface IScreenshot {
  label: string; // "homepage-desktop" | "homepage-mobile" | etc
  dataUrl: string; // base64 data URL, stored inline for simplicity at this scale
  viewport: "desktop" | "mobile";
}

export interface IVisionAnalysis {
  uiScore: number; // 0-100
  uxScore: number;
  accessibilityScore: number;
  conversionScore: number;
  colorPalette: string[];
  typographyNotes: string;
  layoutNotes: string;
  ctaNotes: string;
  navigationNotes: string;
  mobileResponsivenessNotes: string;
  recommendations: string[];
}

export interface ITechDetection {
  name: string;
  category: string; // framework | cms | hosting | analytics | ecommerce
  confidence: number; // 0-100
  evidence: string;
}

export interface ITrustAnalysis {
  trustScore: number; // 1-10
  classification: "Safe" | "Medium Risk" | "High Risk";
  httpsEnabled: boolean;
  securityHeaders: { name: string; present: boolean }[];
  domainAgeYears: number | null;
  registrar: string | null;
  reasoning: string;
}

export interface ICompetitor {
  name: string;
  url: string;
  positioning: string;
  priceComparison: string;
  keyDifference: string;
}

export interface IBusinessModel {
  modelType: string; // SaaS | Marketplace | Ecommerce | Subscription | Ad-based | Lead Generation
  reasoning: string;
  monetizationSignals: string[];
}

export interface ICostEstimate {
  frontendHours: number;
  backendHours: number;
  aiHours: number;
  infraHours: number;
  totalHours: number;
  suggestedTeamSize: number;
  estimatedCostUsd: { low: number; high: number };
  estimatedTimelineWeeks: number;
  reasoning: string;
}

export interface IEmbeddingChunk {
  text: string;
  sourceUrl: string;
  embedding: number[];
}

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  createdAt: Date;
}

// --- Main Site document -------------------------------------------------

export interface ISite {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  url: string;
  domain: string;
  status: "pending" | "crawling" | "analyzing" | "ready" | "failed";
  errorMessage?: string;

  pages: ICrawledPage[];
  contactInfo: IContactInfo;
  pricingText: string | null;
  faqs: { question: string; answer: string }[];

  screenshots: IScreenshot[];
  visionAnalysis: IVisionAnalysis | null;
  techStack: ITechDetection[];
  trustAnalysis: ITrustAnalysis | null;
  competitors: ICompetitor[];
  businessModel: IBusinessModel | null;
  costEstimate: ICostEstimate | null;

  embeddings: IEmbeddingChunk[];
  chatHistory: IChatMessage[];

  createdAt: Date;
  updatedAt: Date;
}

const CrawledPageSchema = new Schema<ICrawledPage>(
  {
    url: String,
    title: String,
    headings: [String],
    textContent: String,
    links: [String],
    isHomepage: Boolean,
  },
  { _id: false }
);

const ScreenshotSchema = new Schema<IScreenshot>(
  {
    label: String,
    dataUrl: String,
    viewport: { type: String, enum: ["desktop", "mobile"] },
  },
  { _id: false }
);

const SiteSchema = new Schema<ISite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    domain: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "crawling", "analyzing", "ready", "failed"],
      default: "pending",
    },
    errorMessage: String,

    pages: [CrawledPageSchema],
    contactInfo: {
      emails: [String],
      phones: [String],
      socialLinks: [String],
      address: String,
    },
    pricingText: { type: String, default: null },
    faqs: [{ question: String, answer: String }],

    screenshots: [ScreenshotSchema],
    visionAnalysis: { type: Schema.Types.Mixed, default: null },
    techStack: [
      {
        name: String,
        category: String,
        confidence: Number,
        evidence: String,
      },
    ],
    trustAnalysis: { type: Schema.Types.Mixed, default: null },
    competitors: [
      {
        name: String,
        url: String,
        positioning: String,
        priceComparison: String,
        keyDifference: String,
      },
    ],
    businessModel: { type: Schema.Types.Mixed, default: null },
    costEstimate: { type: Schema.Types.Mixed, default: null },

    embeddings: [
      {
        text: String,
        sourceUrl: String,
        embedding: [Number],
      },
    ],
    chatHistory: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
        sources: [String],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default models.Site || model<ISite>("Site", SiteSchema);
