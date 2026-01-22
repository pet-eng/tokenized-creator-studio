export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
          return res.status(200).end();
    }
  
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
          const { transcript, guest, episodeType } = req.body || {};
      
          if (!transcript) {
                  return res.status(400).json({ error: 'Transcript is required' });
          }
      
          const apiKey = process.env.ANTHROPIC_API_KEY;
          
          if (!apiKey) {
                  console.error('ANTHROPIC_API_KEY not found in environment');
                  return res.status(500).json({ error: 'API key not configured' });
          }
      
          const systemPrompt = `You are an expert YouTube title strategist for "Tokenized" - a podcast about stablecoins, tokenization, and institutional crypto adoption hosted by Simon Taylor and Cuy Sheffield.
          
          ## Your Top Performing Titles (study these patterns):
          - "Visa's $1.7 Trillion Network Adds Stablecoin Infrastructure" (6:26 video - LOOK AT THE THUMBNAIL)
          - "Stablecoin Infrastructure for Visa Direct's $1.7 Trillion Payout Network" (Similar concept)
          - "Banks Are Waking Up to the Stablecoin Threat" (55:01 video - DRAMATIC)
          - "2026 Predictions: Stablecoins, Tokenization and RWAs" (1:04:07)
          - "The $300 Trillion Dollar Whoopsie" (5.9K views - INTRIGUING)
          - "Every Bank Should Tokenize Deposits" (3.5K views - BOLD CLAIM)
          - "BlackRock Want to Tokenize Everything" (3.1K views - MAJOR PLAYER)
          - "13,000 Banks Get Stablecoin Access" (667 views - SPECIFIC NUMBER)
          - "DTCC Readies $100Tn of Stocks to Go Onchain" (2K views - MASSIVE SCALE)
          
          ## Title Formula That Works:
          1. **Lead with THE BIG PLAYER**: Start with recognizable names (Visa, BlackRock, JP Morgan, Stripe, DTCC, Meta)
          2. **Add MASSIVE NUMBERS**: Be specific ($1.7 Trillion, $100Tn, 13,000 Banks) - bigger = better
          3. **Use ACTION VERBS**: "Waking Up To", "Readies", "Adds", "Get Access" (NOT "discusses" or "talks about")
          4. **Create URGENCY/THREAT**: "Threat", "Panicking", "Must Act", "Before It's Too Late"
          5. **Ask PROVOCATIVE QUESTIONS**: "Should Banks Fear...", "Will X Replace Y?", "Why Does X Want Y?"
          6. **Make BOLD PREDICTIONS**: "Every X Should...", "X Want to Y Everything"
          
          ## Critical Rules:
          - NEVER use vague verbs like "discussing", "exploring", "talking about" - these KILL clicks
          - ALWAYS lead with the most impressive element (biggest company, largest number, boldest claim)
          - Keep titles under 60 characters when possible (YouTube display limit)
          - Use title case for proper nouns, but consider ALL CAPS for dramatic effect in key words
          - If there's a guest, lead with their most impressive credential + a bold claim they make
          
          ## Episode Type Patterns:
          - **Interview Episodes**: "[Guest's Title/Company] Says [Bold Claim]" OR "[Company] + [Big Number] = [Implication]"
          - **Prediction Episodes**: "20XX Predictions: [3 Buzzwords]" OR "What's Coming for [Industry]"
          - **News Episodes**: "[Company] + [Action Verb] + [Big Number/Outcome]"
          - **Series Episodes**:
            * Stablecoin Stories: "How [Company] [Achieved Something Impressive]"
              * Stablecoin Stats: "[Shocking Number/Trend] in Stablecoin [Category]"
                * Agentic Commerce: "AI Agents Will [Bold Prediction About Payments]"
                
                ## Title Testing Checklist (would I click this?):
                ✓ Does it have a number $1M+? (bonus points)
                ✓ Does it name a major company? (required for most)
                ✓ Does it create curiosity/fear/urgency? (required)
                ✓ Can I read it in under 3 seconds? (required)
                ✓ Would I click this over "Company X Discusses Topic Y"? (must be YES)
                
                Generate exactly 8 diverse titles using different formulas. Return ONLY a JSON array of objects with "title" and "hook_type" fields. hook_type should be one of: "number", "company", "threat", "question", "guest", "bold_statement", "series"`;
      
          const userPrompt = `Generate 8 YouTube titles for this Tokenized episode.
          
          Episode Type: ${episodeType || 'Interview'}
          ${guest ? `Guest: ${guest}` : 'No guest specified'}
          
          Transcript/Summary:
          ${transcript.slice(0, 4000)}
          
          Return ONLY valid JSON array like: [{"title": "...", "hook_type": "..."}]`;
      
          console.log('Calling Anthropic API...');
          
          const response = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01'
                  },
                  body: JSON.stringify({
                            model: 'claude-sonnet-4-20250514',
                            max_tokens: 1024,
                            messages: [
                              { role: 'user', content: userPrompt }
                                      ],
                            system: systemPrompt
                  })
          });
      
          if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Anthropic API error:', response.status, errorText);
                  return res.status(500).json({ error: 'Failed to generate titles', details: errorText });
          }
      
          const data = await response.json();
          console.log('Anthropic response received');
          
          const content = data.content[0].text;
          
          // Parse the JSON from Claude's response
          let titles;
          try {
                  // Find JSON array in response
                  const jsonMatch = content.match(/\[[\s\S]*\]/);
                  if (jsonMatch) {
                            titles = JSON.parse(jsonMatch[0]);
                  } else {
                            throw new Error('No JSON array found in response');
                  }
          } catch (parseError) {
                  console.error('Parse error:', parseError.message, 'Content:', content);
                  return res.status(500).json({ error: 'Failed to parse titles', content: content });
          }
      
          return res.status(200).json({ titles });
      
    } catch (error) {
          console.error('Unhandled error:', error.message, error.stack);
          return res.status(500).json({ error: error.message });
    }
}
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, guest, episodeType } = req.body || {};

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const systemPrompt = `You are a YouTube title expert for "Tokenized" - a podcast about stablecoins, tokenization, and institutional crypto adoption hosted by Simon Taylor and Cuy Sheffield.

## Your Top Performing Titles (learn from these):
- "Stablecoin Chains - The Future of Payments? Ft. Chainlink CEO Sergey Nazarov" (14K views)
- "The $300 Trillion Dollar Whoopsie" (5.9K views)
- "Every Bank Should Tokenize Deposits" (3.5K views)
- "BlackRock Want to Tokenize Everything" (3.1K views)
- "Should Banks Fear Stripe Stablecoin Accounts?" (1.4K views)
- "13,000 Banks Get Stablecoin Access" (667 views)
- "DTCC Readies $100Tn of Stocks to Go Onchain" (2K views)
- "Why Does Meta Want a Stablecoin?" (1.9K views)

## What Works:
1. **Big numbers** - Specific amounts like "$300 Trillion", "$100Tn", "13,000 Banks" 
2. **Major company names** - BlackRock, Stripe, Meta, JPMorgan, Visa, DTCC
3. **Threat/fear angle** - "Should Banks Fear...", "The X Threat", "Banks Are Waking Up"
4. **Bold statements** - "Every Bank Should...", "X Want to Y Everything"
5. **Question hooks** - "Will X Replace Y?", "Why Does X Want Y?"
6. **Guest titles** - Include "CEO", "President", "Founder" when impressive

## What Doesn't Work:
- Generic titles without a hook
- Too many topics crammed in
- Vague language like "discussing" or "exploring"
- Titles over 60 characters (too long for YouTube)

## Episode Types:
- **Stablecoin Stories**: Format as "Stablecoin Stories: [Narrative hook about company/person journey]"
- **Stablecoin Stats**: Format as "Stablecoin Stats: [Data-driven insight or trend]"
- **Agentic Commerce**: Format as "Agentic Commerce: [AI/agent payments angle]"
- **Interview**: Lead with the most interesting claim or the guest's credentials
- **News**: Lead with the biggest company or number

Generate exactly 8 titles. Return ONLY a JSON array of objects with "title" and "hook_type" fields. hook_type should be one of: "number", "company", "threat", "question", "guest", "bold_statement", "series"`;

    const userPrompt = `Generate 8 YouTube titles for this Tokenized episode.

Episode Type: ${episodeType || 'Interview'}
${guest ? `Guest: ${guest}` : 'No guest specified'}

Transcript/Summary:
${transcript.slice(0, 4000)}

Return ONLY valid JSON array like: [{"title": "...", "hook_type": "..."}]`;

    console.log('Calling Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to generate titles', details: errorText });
    }

    const data = await response.json();
    console.log('Anthropic response received');
    
    const content = data.content[0].text;
    
    // Parse the JSON from Claude's response
    let titles;
    try {
      // Find JSON array in response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        titles = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError.message, 'Content:', content);
      return res.status(500).json({ error: 'Failed to parse titles', content: content });
    }

    return res.status(200).json({ titles });

  } catch (error) {
    console.error('Unhandled error:', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}
