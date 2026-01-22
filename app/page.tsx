'use client';

import { useState } from 'react';

interface GeneratedTitle {
  text: string;
  tags: string[];
  reasoning: string;
}

type TabType = 'titles' | 'thumbnails';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('titles');
  const [transcript, setTranscript] = useState('');
  const [guest, setGuest] = useState('');
  const [episodeType, setEpisodeType] = useState('interview');
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [guestPhoto, setGuestPhoto] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleGenerateTitles = async () => {
    if (!transcript.trim()) { showToast('Please enter a transcript or summary', 'error'); return; }
    setIsGeneratingTitles(true);
    setTitles([]);
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, guest, episodeType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate titles');
      setTitles(data.titles);
      showToast(`Generated ${data.titles.length} titles!`);
    } catch (error) {
      console.error('Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to generate titles', 'error');
    } finally { setIsGeneratingTitles(false); }
  };

  const handleGuestPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setGuestPhoto(event.target?.result as string); showToast('Guest photo loaded!'); };
    reader.readAsDataURL(file);
  };

  const handleGenerateThumbnail = async () => {
    if (!headline.trim()) { showToast('Please enter a headline', 'error'); return; }
    setIsGeneratingThumbnail(true);
    setThumbnailImage(null);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      canvas.width = 1280;
      canvas.height = 720;
      // Bright blue gradient background (Tokenized style)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a4a7a');
      gradient.addColorStop(0.5, '#2d6eb5');
      gradient.addColorStop(1, '#1a4a7a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Radial light effect
      const radialGlow = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.4, 0, canvas.width * 0.7, canvas.height * 0.4, 600);
      radialGlow.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
      radialGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Guest photo on LEFT side
      if (guestPhoto) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const imgHeight = 650;
            const imgWidth = (img.width / img.height) * imgHeight;
            const x = -50;
            const y = canvas.height - imgHeight + 50;
            ctx.drawImage(img, x, y, imgWidth, imgHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = guestPhoto;
        });
      }
      // Split headline into stacked lines
      const words = headline.toUpperCase().split(' ');
      const lines: string[] = [];
      if (words.length <= 2) { lines.push(...words); }
      else if (words.length === 3) { lines.push(words[0], words[1], words[2]); }
      else if (words.length === 4) { lines.push(words[0], words[1], words[2], words[3]); }
      else {
        const wordsPerLine = Math.ceil(words.length / 3);
        for (let i = 0; i < words.length; i += wordsPerLine) { lines.push(words.slice(i, i + wordsPerLine).join(' ')); }
      }
      // Text on RIGHT side
      const textX = guestPhoto ? 520 : 100;
      const startY = 150;
      const lineHeight = 130;
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        ctx.font = 'bold 95px Arial Black, Arial, sans-serif';
        const metrics = ctx.measureText(line);
        const textWidth = metrics.width;
        const textHeight = 95;
        const boxPadding = 15;
        const boxX = textX - boxPadding;
        const boxY = startY + (i * lineHeight) - textHeight + 10;
        const boxWidth = textWidth + (boxPadding * 2);
        const boxHeight = textHeight + boxPadding;
        // Black background box
        ctx.fillStyle = '#000000';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        // Cyan text
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 95px Arial Black, Arial, sans-serif';
        ctx.fillText(line, textX, startY + (i * lineHeight));
      });
      setThumbnailImage(canvas.toDataURL('image/png'));
      showToast('Thumbnail generated!');
    } catch (error) {
      console.error('Error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to generate thumbnail', 'error');
    } finally { setIsGeneratingThumbnail(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); showToast('Copied to clipboard!'); };

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
      if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
        text = text.replace(/^\d+\s*$/gm, '').replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g, '').replace(/WEBVTT.*$/m, '').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
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
          <div className="logo-text"><h1>Creator Studio</h1><span>Tokenized Podcast</span></div>
        </div>
        <div className="tabs">
          <button className={`tab ${activeTab === 'titles' ? 'active' : ''}`} onClick={() => setActiveTab('titles')}>Titles</button>
          <button className={`tab ${activeTab === 'thumbnails' ? 'active' : ''}`} onClick={() => setActiveTab('thumbnails')}>Thumbnails</button>
        </div>
      </header>
      <section className={`section ${activeTab === 'titles' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Episode Input</div><span className="ai-badge">⚡ Claude AI</span></div>
            <div className="panel-body">
              <div className="input-group">
                <label>Episode Transcript or Summary</label>
                <textarea className="transcript-input" placeholder="Paste the episode transcript, show notes, or a summary of the key topics discussed..." value={transcript} onChange={(e) => setTranscript(e.target.value)} />
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" id="transcriptFile" accept=".txt,.srt,.vtt" onChange={handleFileUpload} />
                  <button className="btn btn-secondary file-upload-btn" onClick={() => document.getElementById('transcriptFile')?.click()}>📄 Upload Transcript</button>
                </div>
              </div>
              <div className="input-group"><label>Guest Name(s)</label><input type="text" placeholder="e.g., Sergey Nazarov, CEO of Chainlink" value={guest} onChange={(e) => setGuest(e.target.value)} /></div>
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
                <button className="btn" onClick={handleGenerateTitles} disabled={isGeneratingTitles}>{isGeneratingTitles ? (<><span className="spinner" style={{ width: 16, height: 16 }} />Generating...</>) : (<><span>⚡</span> Generate Titles</>)}</button>
                <button className="btn btn-secondary" onClick={() => { setTranscript(''); setGuest(''); setTitles([]); }}>Clear</button>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Generated Titles</div>{titles.length > 0 && (<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{titles.length} titles</span>)}</div>
            <div className="panel-body">
              {isGeneratingTitles ? (<div className="loading"><div className="spinner" /><div className="loading-text">Claude is crafting your titles...</div></div>) : titles.length === 0 ? (<div className="results-empty"><div className="results-empty-icon">📝</div><p>Paste a transcript and click Generate to create AI-powered titles</p></div>) : (titles.map((title, i) => (<div key={i} className="title-result" onClick={() => copyToClipboard(title.text)}><div className="title-text">{title.text}</div><div className="title-meta">{title.tags.map((tag) => (<span key={tag} className={`title-tag ${tag}`}>{tag}</span>))}</div><div className="title-reasoning">{title.reasoning}</div><div className="title-actions"><button className="title-action-btn" onClick={(e) => { e.stopPropagation(); copyToClipboard(title.text); }}>📋</button></div></div>)))}
            </div>
          </div>
        </div>
      </section>
      <section className={`section ${activeTab === 'thumbnails' ? 'active' : ''}`}>
        <div className="main-grid">
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Thumbnail Generator</div><span className="ai-badge">🎨 Canvas</span></div>
            <div className="panel-body">
              <div className="input-group"><label>Headline Text</label><input type="text" placeholder="e.g., TOKENIZED STOCKS ARE HERE" value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
              <div className="input-group">
                <label>Guest Photo (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" id="guestPhotoFile" accept="image/*" onChange={handleGuestPhotoUpload} />
                  <button className="btn btn-secondary file-upload-btn" onClick={() => document.getElementById('guestPhotoFile')?.click()}>📷 Upload Photo</button>
                  {guestPhoto && (<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><img src={guestPhoto} alt="Guest preview" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} /><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setGuestPhoto(null)}>✕</button></div>)}
                </div>
              </div>
              <div className="btn-group">
                <button className="btn" onClick={handleGenerateThumbnail} disabled={isGeneratingThumbnail}>{isGeneratingThumbnail ? (<><span className="spinner" style={{ width: 16, height: 16 }} />Generating...</>) : (<><span>🎨</span> Generate Thumbnail</>)}</button>
                <button className="btn btn-secondary" onClick={() => { setHeadline(''); setSubtext(''); setGuestPhoto(null); setGuestName(''); setThumbnailImage(null); }}>Clear</button>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Generated Thumbnail</div></div>
            <div className="panel-body">
              {isGeneratingThumbnail ? (<div className="loading"><div className="spinner" /><div className="loading-text">Creating your thumbnail...</div></div>) : thumbnailImage ? (<div className="thumbnail-result"><div className="thumbnail-preview"><img src={thumbnailImage} alt="Generated thumbnail" /></div><div className="thumbnail-actions"><button className="btn" onClick={downloadThumbnail}>⬇️ Download</button><button className="btn btn-secondary" onClick={handleGenerateThumbnail}>🔄 Regenerate</button></div></div>) : (<div className="results-empty"><div className="results-empty-icon">🎨</div><p>Enter a headline and click Generate to create a thumbnail</p></div>)}
            </div>
          </div>
        </div>
      </section>
      {toast && (<div className={`toast show ${toast.type === 'error' ? 'error' : ''}`}>{toast.message}</div>)}
    </div>
  );
}
