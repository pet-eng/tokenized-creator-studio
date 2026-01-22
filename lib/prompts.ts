// Top performing title examples from Tokenized Podcast
export const TOP_PERFORMING_TITLES = [
  { title: "Stablecoin Chains - The Future of Payments? Ft. Chainlink CEO Sergey Nazarov", views: "14K", pattern: "Topic + Question + Guest" },
  { title: "The $300 Trillion Dollar Whoopsie", views: "5.9K", pattern: "Shocking Money Amount" },
  { title: "Every Bank Should Tokenize Deposits", views: "3.5K", pattern: "Bold Statement" },
  { title: "BlackRock Want to Tokenize Everything", views: "3.5K", pattern: "Big Company + Bold Action" },
  { title: "Should Banks Fear Stripe Stablecoin Accounts?", views: "2K+", pattern: "Question + Threat" },
  { title: "13,000 Banks Get Stablecoin Access", views: "2K+", pattern: "Specific Number + Trend" },
  { title: "DTCC Readies $100T of Stocks", views: "2K+", pattern: "Institution + Money Amount" },
];

export const TITLE_GENERATION_PROMPT = `You are a YouTube title expert for "Tokenized" - a podcast about stablecoins, tokenization, and the future of payments. Your job is to generate compelling, click-worthy titles.

## CONTEXT
Tokenized is hosted by Simon Taylor (Head of Market Dev at Tempo, author of Fintech Brainfood). The audience is finance professionals, crypto enthusiasts, and fintech leaders interested in:
- Stablecoins (USDC, USDT, Tether, Circle, etc.)
- Tokenization of real-world assets (RWAs)
- Payments infrastructure
- DeFi meeting TradFi
- Regulatory developments (GENIUS Act, MiCA, etc.)

## TOP PERFORMING TITLE PATTERNS (ranked by views)
1. **Guest Authority + Bold Topic** (14K views): "Stablecoin Chains - The Future of Payments? Ft. Chainlink CEO Sergey Nazarov"
2. **Shocking Money Amount** (5.9K views): "The $300 Trillion Dollar Whoopsie"
3. **Bold Declarative Statement** (3.5K views): "Every Bank Should Tokenize Deposits"
4. **Big Company + Action** (3.5K views): "BlackRock Want to Tokenize Everything"
5. **Threat/Fear Question** (2K+ views): "Should Banks Fear Stripe Stablecoin Accounts?"
6. **Specific Number + Trend** (2K+ views): "13,000 Banks Get Stablecoin Access"

## RULES
1. Keep titles under 60 characters when possible (YouTube truncates longer titles)
2. Use specific numbers - "13,000" not "thousands"
3. Use power words: "Every", "All", "Must", "Secret", "War", "Fear"
4. Questions work well when they imply threat or major change
5. Guest names in title ONLY if they're recognizable (CEOs, founders)
6. Always include company names when relevant (Stripe, Circle, BlackRock, etc.)
7. Avoid generic words like "interesting", "great", "amazing"
8. Create FOMO - make viewers feel they'll miss out

## SERIES FORMATS
If the episode is part of a series, use these exact formats:
- **Stablecoin Stories**: "Stablecoin Stories: [Company/Person Journey]"
- **Stablecoin Stats**: "Stablecoin Stats: [Data Insight]"
- **Agentic Commerce**: "Agentic Commerce: [AI + Payments Topic]"

## OUTPUT FORMAT
Generate 8-10 titles. For each title, provide:
1. The title text
2. Category tags (from: guest, company, number, question, hook, threat, series, future, news)
3. Brief reasoning (1 sentence explaining why this will perform)

Format as JSON array:
[
  {
    "text": "Title here",
    "tags": ["tag1", "tag2"],
    "reasoning": "Why this works"
  }
]`;

export const THUMBNAIL_GENERATION_PROMPT = `Create a YouTube thumbnail for the Tokenized podcast with these specifications:

BRAND STYLE:
- Dark blue gradient background (#0a1628 to #1e3a5f)
- "TOKENIZED" logo/text in top right corner (white text)
- Clean, professional fintech aesthetic
- High contrast text for readability

LAYOUT:
- 16:9 aspect ratio (1280x720 or 1920x1080)
- Main headline in bold white text, centered or left-aligned
- If featuring a company: include their logo prominently
- If featuring a guest: space for their photo on right side
- Sponsor bar at bottom (optional): "SPONSORED BY [Visa logo] | PRESENTED BY [BVNK logo]"
- Date badge in top left corner (format: "DD MMM")

TEXT STYLE:
- Headlines: Bold, uppercase, white
- Subtitles: Smaller, cyan (#00c8ff)
- Maximum 4-6 words for main headline
- Text should be readable at small sizes (mobile thumbnails)

VISUAL ELEMENTS:
- Subtle gradient overlay
- Occasional accent glow effects (cyan)
- Professional, not flashy or "crypto bro" aesthetic
- Think Bloomberg/Financial Times meets modern tech`;

export function buildTitlePrompt(transcript: string, guest: string, episodeType: string): string {
  let contextualInstructions = '';

  if (episodeType === 'stablecoin-stories') {
    contextualInstructions = `\n\nThis is a STABLECOIN STORIES episode - a series featuring company journeys and founder stories. At least 3 titles should use the "Stablecoin Stories:" prefix format.`;
  } else if (episodeType === 'stablecoin-stats') {
    contextualInstructions = `\n\nThis is a STABLECOIN STATS episode - a data-driven series. At least 3 titles should use the "Stablecoin Stats:" prefix format and reference specific metrics.`;
  } else if (episodeType === 'agentic-commerce') {
    contextualInstructions = `\n\nThis is an AGENTIC COMMERCE episode - a series about AI agents and payments. At least 3 titles should use the "Agentic Commerce:" prefix format.`;
  } else if (episodeType === 'predictions') {
    contextualInstructions = `\n\nThis is a PREDICTIONS episode. Include at least 2 titles with year predictions format (e.g., "2025 Predictions: ...")`;
  }

  const guestInstruction = guest
    ? `\n\nGUEST: ${guest}\nInclude the guest name in at least 2 titles, especially if they have a notable title (CEO, Founder, etc.)`
    : '\n\nNo guest for this episode - focus on topic-driven titles.';

  return `${TITLE_GENERATION_PROMPT}${contextualInstructions}${guestInstruction}

## EPISODE CONTENT
${transcript}

Generate titles now:`;
}

export function buildThumbnailPrompt(headline: string, subtext: string, company?: string, hasGuest?: boolean): string {
  let specific = THUMBNAIL_GENERATION_PROMPT;

  specific += `\n\nSPECIFIC REQUIREMENTS FOR THIS THUMBNAIL:`;
  specific += `\n- Main headline: "${headline}"`;

  if (subtext) {
    specific += `\n- Subtext: "${subtext}"`;
  }

  if (company) {
    specific += `\n- Feature the ${company} logo prominently`;
  }

  if (hasGuest) {
    specific += `\n- Leave space on the right side for a guest photo cutout`;
  }

  specific += `\n\nCreate a professional, eye-catching thumbnail that matches the Tokenized brand.`;

  return specific;
}
