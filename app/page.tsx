'use client';

import { useState } from 'react';

interface GeneratedTitle {
  text: string;
  tags: string[];
  reasoning: string;
}

interface TitleIteration {
  text: string;
  angle: string;
}

export default function Home() {
  // Title generation state
  const [transcript, setTranscript] = useState('');
  const [guest, setGuest] = useState('');
  const [episodeType, setEpisodeType] = useState('interview');
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Iteration state
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [iterations, setIterations] = useState<TitleIteration[]>([]);
  const [isIterating, setIsIterating] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Known hosts to exclude from guest detection
  const HOSTS = ['simon taylor', 'sy taylor', 'cuy sheffield'];

  const extractGuestFromTranscript = (text: string): string => {
    // Pattern 1: Speaker labels like "Jess Houlgrave  0:32" or "Jess Houlgrave 0:32"
    const speakerPattern = /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\s+\d+:\d+/gm;
    const speakers = new Set<string>();
    let match;
    while ((match = speakerPattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (!HOSTS.some(h => name.toLowerCase().includes(h))) {
        speakers.add(name);
      }
    }

    if (speakers.size === 0) return '';

    const guestName = [...speakers][0];

    // Look for title/role near the guest name: "CEO of X", "Founder of X", "President of X", etc.
    const rolePatterns = [
      new RegExp(`${guestName.split(' ')[0]}[^.]*?(?:CEO|CTO|COO|CFO|CPO|CMO|President|Founder|Co-Founder|Head|Director|VP|Managing Director|Partner|General Partner)\\s+(?:of|at|,)?\\s+([A-Z][\\w\\s&.-]+?)(?:[,.]|\\s+and\\s|\\s+who|\\s+from|$)`, 'i'),
      new RegExp(`(?:CEO|CTO|COO|CFO|CPO|CMO|President|Founder|Co-Founder|Head|Director|VP|Managing Director|Partner|General Partner)\\s+(?:of|at|,)?\\s+([A-Z][\\w\\s&.-]+?)(?:[,.]|\\s+${guestName.split(' ')[0]}|$)`, 'i'),
      new RegExp(`(?:guest[,.]?|joined by|welcome)\\s+[^.]*?${guestName.split(' ')[0]}[^.]*?(?:CEO|CTO|Founder|Co-Founder|President|Head|Director)\\s+(?:of|at)\\s+([A-Z][\\w\\s&.-]+?)(?:[,.]|$)`, 'i'),
    ];

    for (const pattern of rolePatterns) {
      const roleMatch = text.match(pattern);
      if (roleMatch?.[1]) {
        const company = roleMatch[1].trim().replace(/\s+/g, ' ');
        // Find the role itself
        const roleKeyword = text.match(new RegExp(`(CEO|CTO|COO|CFO|CPO|CMO|President|Founder|Co-Founder|Head|Director|VP|Managing Director|Partner|General Partner)\\s+(?:of|at)\\s+${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        if (roleKeyword) {
          return `${guestName}, ${roleKeyword[1]} of ${company}`;
        }
        return `${guestName}, ${company}`;
      }
    }

    return guestName;
  };

  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    // Only auto-fill guest if the field is empty
    if (!guest.trim()) {
      const detectedGuest = extractGuestFromTranscript(text);
      if (detectedGuest) {
        setGuest(detectedGuest);
      }
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleGenerateTitles = async () => {
    if (!transcript.trim()) {
      showToast('Please enter a transcript or summary', 'error');
      return;
    }

    setIsGeneratingTitles(true);
    setTitles([]);
    setSelectedTitleIndex(null);
    setIterations([]);

    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, guest, episodeType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate titles');
      }

      setTitles(data.titles);
      showToast(`Generated ${data.titles.length} titles!`);
    } catch (error) {
      console.error('Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to generate titles', 'error');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const handleIterateTitle = async (index: number) => {
    // If clicking the same title, collapse
    if (selectedTitleIndex === index) {
      setSelectedTitleIndex(null);
      setIterations([]);
      return;
    }

    setSelectedTitleIndex(index);
    setIterations([]);
    setIsIterating(true);

    try {
      const response = await fetch('/api/iterate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedTitle: titles[index].text,
          transcript,
          guest,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to iterate title');
      }

      setIterations(data.iterations);
    } catch (error) {
      console.error('Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to iterate title', 'error');
      setSelectedTitleIndex(null);
    } finally {
      setIsIterating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;

      // Strip SRT/VTT timestamps
      if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
        text = text
          .replace(/^\d+\s*$/gm, '')
          .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g, '')
          .replace(/WEBVTT.*$/m, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      handleTranscriptChange(text);
      showToast(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="container">
      <header>
        <div className="logo">
          <div className="logo-icon">T</div>
          <div className="logo-text">
            <h1>Creator Studio</h1>
            <span>Tokenized Podcast</span>
          </div>
        </div>
      </header>

      <div className="main-grid">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Episode Input</div>
              <span className="ai-badge">⚡ Claude AI</span>
            </div>
            <div className="panel-body">
              <div className="input-group">
                <label>Episode Transcript or Summary</label>
                <textarea
                  className="transcript-input"
                  placeholder="Paste the episode transcript, show notes, or a summary of the key topics discussed..."
                  value={transcript}
                  onChange={(e) => handleTranscriptChange(e.target.value)}
                />
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="file"
                    id="transcriptFile"
                    accept=".txt,.srt,.vtt"
                    onChange={handleFileUpload}
                  />
                  <button
                    className="btn btn-secondary file-upload-btn"
                    onClick={() => document.getElementById('transcriptFile')?.click()}
                  >
                    📄 Upload Transcript
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Guest Name(s)</label>
                <input
                  type="text"
                  placeholder="e.g., Sergey Nazarov, CEO of Chainlink"
                  value={guest}
                  onChange={(e) => setGuest(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Episode Type</label>
                <select value={episodeType} onChange={(e) => setEpisodeType(e.target.value)}>
                  <option value="interview">Interview</option>
                  <option value="news">News & Analysis</option>
                  <option value="deep-dive">Deep Dive</option>
                  <option value="predictions">Predictions</option>
                  <option value="stablecoin-stories">Stablecoin Stories</option>
                  <option value="stablecoin-stats">Stablecoin Stats</option>
                  <option value="agentic-commerce">Agentic Commerce</option>
                  <option value="bonus">Bonus / Special</option>
                </select>
              </div>

              <div className="btn-group">
                <button
                  className="btn"
                  onClick={handleGenerateTitles}
                  disabled={isGeneratingTitles}
                >
                  {isGeneratingTitles ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Generate Titles
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setTranscript('');
                    setGuest('');
                    setTitles([]);
                    setSelectedTitleIndex(null);
                    setIterations([]);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Generated Titles</div>
              {titles.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {titles.length} titles
                </span>
              )}
            </div>
            <div className="panel-body">
              {isGeneratingTitles ? (
                <div className="loading">
                  <div className="spinner" />
                  <div className="loading-text">Claude is crafting your titles...</div>
                </div>
              ) : titles.length === 0 ? (
                <div className="results-empty">
                  <div className="results-empty-icon">📝</div>
                  <p>Paste a transcript and click Generate to create AI-powered titles</p>
                </div>
              ) : (
                titles.map((title, i) => (
                  <div key={i}>
                    <div
                      className={`title-result ${selectedTitleIndex === i ? 'selected' : ''}`}
                      onClick={() => handleIterateTitle(i)}
                    >
                      <div className="title-text">{title.text}</div>
                      <div className="title-meta">
                        {title.tags.map((tag) => (
                          <span key={tag} className={`title-tag ${tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="title-reasoning">{title.reasoning}</div>
                      <div className="title-actions">
                        <button
                          className="title-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(title.text);
                          }}
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                      {selectedTitleIndex !== i && (
                        <div className="iterate-hint">Click to iterate</div>
                      )}
                    </div>

                    {/* Inline iterations */}
                    {selectedTitleIndex === i && (
                      <div className="iterations-container">
                        {isIterating ? (
                          <div className="iterations-loading">
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                            <span>Generating variations...</span>
                          </div>
                        ) : iterations.length > 0 ? (
                          iterations.map((iter, j) => (
                            <div
                              key={j}
                              className="iteration-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(iter.text);
                              }}
                            >
                              <div className="iteration-text">{iter.text}</div>
                              <div className="iteration-angle">{iter.angle}</div>
                            </div>
                          ))
                        ) : null}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`toast show ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
