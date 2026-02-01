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

type TabType = 'titles' | 'thumbnails';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('titles');

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

  // Thumbnail generation state
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [company, setCompany] = useState('');
  const [hasGuest, setHasGuest] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const handleGenerateThumbnail = async () => {
    if (!headline.trim()) {
      showToast('Please enter a headline', 'error');
      return;
    }

    setIsGeneratingThumbnail(true);
    setThumbnailImage(null);

    try {
      const response = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, subtext, company, hasGuest }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate thumbnail');
      }

      setThumbnailImage(data.image);
      showToast('Thumbnail generated!');
    } catch (error) {
      console.error('Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to generate thumbnail', 'error');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  const downloadThumbnail = () => {
    if (!thumbnailImage) return;

    const link = document.createElement('a');
    link.href = thumbnailImage;
    link.download = `tokenized-thumbnail-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Thumbnail downloaded!');
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

      setTranscript(text);
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
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'titles' ? 'active' : ''}`}
            onClick={() => setActiveTab('titles')}
          >
            Titles
          </button>
          <button
            className={`tab ${activeTab === 'thumbnails' ? 'active' : ''}`}
            onClick={() => setActiveTab('thumbnails')}
          >
            Thumbnails
          </button>
        </div>
      </header>

      {/* TITLES SECTION */}
      <section className={`section ${activeTab === 'titles' ? 'active' : ''}`}>
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
                  onChange={(e) => setTranscript(e.target.value)}
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
      </section>

      {/* THUMBNAILS SECTION */}
      <section className={`section ${activeTab === 'thumbnails' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Thumbnail Generator</div>
              <span className="ai-badge">🎨 Gemini</span>
            </div>
            <div className="panel-body">
              <div className="input-group">
                <label>Headline Text</label>
                <input
                  type="text"
                  placeholder="e.g., BANKS ARE PANICKING"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Subtext (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Stablecoins are coming"
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Company/Logo to Feature (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Circle, Stripe, BlackRock"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={hasGuest}
                    onChange={(e) => setHasGuest(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  Include space for guest photo
                </label>
              </div>

              <div className="btn-group">
                <button
                  className="btn"
                  onClick={handleGenerateThumbnail}
                  disabled={isGeneratingThumbnail}
                >
                  {isGeneratingThumbnail ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>🎨</span> Generate Thumbnail
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Generated Thumbnail</div>
            </div>
            <div className="panel-body">
              {isGeneratingThumbnail ? (
                <div className="loading">
                  <div className="spinner" />
                  <div className="loading-text">Gemini is creating your thumbnail...</div>
                </div>
              ) : thumbnailImage ? (
                <div className="thumbnail-result">
                  <div className="thumbnail-preview">
                    <img src={thumbnailImage} alt="Generated thumbnail" />
                  </div>
                  <div className="thumbnail-actions">
                    <button className="btn" onClick={downloadThumbnail}>
                      ⬇️ Download
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleGenerateThumbnail}
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="results-empty">
                  <div className="results-empty-icon">🎨</div>
                  <p>Enter a headline and click Generate to create a thumbnail</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Toast notification */}
      {toast && (
        <div className={`toast show ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
