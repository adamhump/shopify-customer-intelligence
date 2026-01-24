import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';

/**
 * Extract email username for adjacent signal searches
 */
function extractEmailUsername(email) {
  if (!email) return null;
  return email.split('@')[0];
}

/**
 * Analyze email for patterns (numbers might be birth year)
 */
function analyzeEmailPattern(email) {
  if (!email) return null;

  const username = extractEmailUsername(email);
  const numbers = username.match(/\d+/);

  if (numbers && numbers[0].length === 2) {
    // Two-digit number - could be birth year
    const yearSuffix = parseInt(numbers[0]);
    const currentYear = new Date().getFullYear();
    const century = yearSuffix > 50 ? 1900 : 2000;
    const birthYear = century + yearSuffix;
    const age = currentYear - birthYear;

    if (age >= 18 && age <= 80) {
      return { likelyBirthYear: birthYear, estimatedAge: age };
    }
  }

  return null;
}

/**
 * Search the web using Brave Search API with multiple strategies
 * Iteration 2: Includes adjacent signal queries and sequential execution
 */
async function searchWebMultiStrategy(name, location, country, email) {
  if (!process.env.BRAVE_API_KEY) {
    console.warn('BRAVE_API_KEY not configured. Skipping web search.');
    return [];
  }

  const allResults = [];
  const emailUsername = extractEmailUsername(email);

  // Build search queries with different strategies
  const queries = [];

  // STAGE 1: Direct identity anchors
  if (location && country) {
    queries.push(`"${name}" ${location} ${country}`);
  } else if (location) {
    queries.push(`"${name}" ${location}`);
  }
  queries.push(`"${name}" site:linkedin.com/in`);

  // STAGE 2: High-yield verticals
  if (country) {
    const countryCode = getCountryCode(country);
    if (countryCode) {
      queries.push(`"${name}" site:.edu.${countryCode}`);
      queries.push(`"${name}" site:.ac.${countryCode}`); // Academic domains
    }
  }
  queries.push(`"${name}" site:.edu`);
  queries.push(`"${name}" site:instagram.com`);

  // STAGE 3: Adjacent signals (NEW in Iteration 2)
  if (emailUsername && emailUsername !== name.toLowerCase().replace(' ', '')) {
    // Email username is different from name - might be a handle
    queries.push(`"${emailUsername}" ${location || ''}`);
  }

  // Execute searches sequentially with delay to avoid rate limiting
  console.log(`  Executing ${queries.length} queries sequentially...`);

  for (let i = 0; i < Math.min(queries.length, 6); i++) {
    const query = queries[i];
    try {
      console.log(`  Query ${i + 1}/${Math.min(queries.length, 6)}: ${query}`);

      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': process.env.BRAVE_API_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error(`Brave Search API error for "${query}": ${response.status}`);
        if (response.status === 429) {
          console.log('  Rate limited - waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        continue;
      }

      const data = await response.json();
      const results = data.web?.results || [];

      // Add results with deduplication
      results.forEach(result => {
        if (!allResults.some(r => r.url === result.url)) {
          allResults.push(result);
        }
      });

      // Small delay between requests to avoid rate limiting
      if (i < queries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`Error searching "${query}":`, error.message);
    }
  }

  console.log(`  Found ${allResults.length} unique results across ${queries.length} queries`);
  return allResults;
}

/**
 * Get country code for academic search
 */
function getCountryCode(country) {
  const codes = {
    'Australia': 'au',
    'United Kingdom': 'uk',
    'Canada': 'ca',
    'United States': 'us',
    'New Zealand': 'nz',
    'Germany': 'de',
    'France': 'fr',
    'Italy': 'it',
    'Spain': 'es',
  };
  return codes[country] || null;
}

/**
 * Enrich customer data using Claude AI with web search
 * @param {Object} customer - Customer data from Shopify
 * @returns {Promise<Object>} Enriched customer data
 */
export async function enrichCustomerData(customer) {
  const { name, email, city, state, country } = customer;

  console.log(`Enriching data for: ${name} from ${city}, ${state}`);

  // Check if Claude API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured. Skipping enrichment.');
    return {
      occupation: null,
      age: null,
      education: null,
      description: null,
      socialProfiles: [],
    };
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build location string
    const location = city && state ? `${city}, ${state}` : (city || state || '');

    // Analyze email pattern for contextual clues
    const emailAnalysis = analyzeEmailPattern(email);
    const emailUsername = extractEmailUsername(email);

    // Search the web for the customer with multiple strategies
    console.log(`Searching web with multiple strategies for: ${name} in ${location || 'unknown location'}`);
    const searchResults = await searchWebMultiStrategy(name, location, country, email);

    // Build context from search results
    let searchContext = '';
    if (searchResults && searchResults.length > 0) {
      searchContext = '\n\nWeb Search Results:\n';
      searchResults.forEach((result, index) => {
        searchContext += `\n${index + 1}. ${result.title}\n`;
        searchContext += `   URL: ${result.url}\n`;
        searchContext += `   ${result.description}\n`;
      });
    } else {
      searchContext = '\n\nNo web search results found for this person.';
    }

    // Build contextual clues section
    let contextualClues = '\n\nContextual Analysis:\n';
    if (emailAnalysis) {
      contextualClues += `- Email pattern suggests birth year ~${emailAnalysis.likelyBirthYear} (age ~${emailAnalysis.estimatedAge})\n`;
    }
    if (emailUsername) {
      contextualClues += `- Email username: "${emailUsername}"\n`;
    }
    if (email) {
      contextualClues += `- Email domain: ${email.split('@')[1]}\n`;
    }

    // Create a prompt for Claude with probabilistic scoring
    const prompt = `You are an intelligence analyst building identity profiles from incomplete data.

CUSTOMER DATA:
- Name: ${name}
- Location: ${location || 'unknown'}
${contextualClues}
${searchContext}

TASK: Multi-Candidate Probabilistic Identity Scoring

Build up to 3 candidate identities from the search results, ranked by confidence. Use Bayesian-style reasoning to weigh evidence.

METHODOLOGY:
1. **Identify Candidates**: Look for any person matching the name in search results
2. **Score Each Candidate**:
   - Location match (+30 points if exact city/state match)
   - Age compatibility with email pattern (+20 points if consistent)
   - Professional presence (+20 points for LinkedIn/faculty page)
   - Name uniqueness (+10 points if uncommon name)
   - Multiple independent sources (+20 points)

3. **Competing Hypotheses**: For each candidate, explain:
   - What evidence supports this match?
   - What evidence contradicts this match?
   - What's the confidence level (0-100)?

4. **Graceful Degradation**: If no strong match (confidence <40), provide:
   - Neighborhood demographic inference (if location known)
   - "What we know" vs "What we'd need to confirm"

5. **Contextual Enrichment**:
   - Use email patterns (numbers = birth year?)
   - Cross-reference location demographics
   - Synthesize weak signals into reasonable inferences

CRITICAL RULES:
- Be probabilistic, not certain
- Show your reasoning explicitly
- Label confidence levels clearly
- If low confidence, say "Likely a private individual with minimal online presence"
- NEVER fabricate - if unsure, explain what's missing

OUTPUT FORMAT (JSON):
{
  "primaryCandidate": {
    "confidence": 75,
    "reasoning": "LinkedIn profile exact name + city match + .edu email domain suggests academic professional",
    "age": "~45 (estimated from email pattern esorkin20 suggesting birth year 2020... wait that's wrong, likely 1975)",
    "occupation": "Associate Professor",
    "education": "PhD University of Chicago",
    "description": "Associate Professor at Georgetown University specializing in environmental policy.",
    "linkedInUrl": "https://linkedin.com/in/emilysorkin",
    "instagramUrl": null,
    "xUrl": null
  },
  "alternativeCandidates": [
    {
      "confidence": 35,
      "reasoning": "Instagram account same name, but no location verification",
      "occupation": "Graphic designer (from IG bio)",
      "instagramUrl": "https://instagram.com/emily.sorkin"
    }
  ],
  "contextualInference": {
    "neighborhoodDemographics": "Washington DC resident, likely 20s-40s professional given .com email",
    "synthesizedProfile": "Likely a college-educated professional living in DC metro area. Email pattern suggests millennial demographic."
  },
  "finalRecommendation": "primary" | "alternative-1" | "contextual-only",
  "whatWeKnow": ["Lives in Washington DC", "Uses email esorkin20@gmail.com"],
  "whatWeMissing": ["Strong professional presence", "Public social media", "Direct location confirmation"]
}

EXAMPLE - High Confidence Match:
{
  "primaryCandidate": {
    "confidence": 95,
    "reasoning": "Faculty page at sydney.edu.au with exact name match. LinkedIn profile confirms same location. Multiple independent sources (university site, ResearchGate, LinkedIn).",
    "age": null,
    "occupation": "Professor of Gender Studies",
    "education": "University of Sydney",
    "description": "Professor of Gender Studies at University of Sydney, Australia.",
    "linkedInUrl": "https://linkedin.com/in/gracesharkey",
    "instagramUrl": null,
    "xUrl": null
  },
  "alternativeCandidates": [],
  "contextualInference": null,
  "finalRecommendation": "primary",
  "whatWeKnow": ["Professor at University of Sydney", "Active on LinkedIn", "Gender studies researcher"],
  "whatWeMissing": ["Age information", "Personal social media"]
}

EXAMPLE - Low Confidence, Contextual Only:
{
  "primaryCandidate": null,
  "alternativeCandidates": [],
  "contextualInference": {
    "neighborhoodDemographics": "Newport RI resident, affluent coastal community, median household income $85K, 70% college-educated",
    "synthesizedProfile": "Likely an established professional or retiree given Newport location. Email domain suggests personal account, not corporate."
  },
  "finalRecommendation": "contextual-only",
  "whatWeKnow": ["Lives in Newport, RI", "Name: Chris Wilson", "Uses standard gmail"],
  "whatWeMissing": ["LinkedIn profile", "Professional website", "Public social media with location tags", "Name is very common making disambiguation impossible"]
}

Be rigorous. Be probabilistic. Show your work.`;

    // Call Claude - using Haiku for reliability (Sonnet not available on this API key)
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse Claude's response
    const responseText = message.content[0].text;
    console.log('Claude response (Iteration 2):', responseText);

    // Try to parse JSON from the response
    let analysisData;
    try {
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      return {
        occupation: null,
        age: null,
        education: null,
        description: 'Error processing enrichment data.',
        socialProfiles: [],
      };
    }

    // Select the best candidate based on finalRecommendation
    let selectedCandidate = null;

    if (analysisData.finalRecommendation === 'primary' && analysisData.primaryCandidate) {
      selectedCandidate = analysisData.primaryCandidate;
    } else if (analysisData.finalRecommendation?.startsWith('alternative') && analysisData.alternativeCandidates) {
      const altIndex = parseInt(analysisData.finalRecommendation.split('-')[1]) - 1;
      selectedCandidate = analysisData.alternativeCandidates[altIndex];
    }

    // If we have a selected candidate, use it
    if (selectedCandidate && selectedCandidate.confidence >= 40) {
      const socialProfiles = [];

      if (selectedCandidate.linkedInUrl) {
        socialProfiles.push({
          platform: 'LinkedIn',
          url: selectedCandidate.linkedInUrl,
          username: extractUsernameFromUrl(selectedCandidate.linkedInUrl, 'linkedin.com/in/')
        });
      }

      if (selectedCandidate.instagramUrl) {
        socialProfiles.push({
          platform: 'Instagram',
          url: selectedCandidate.instagramUrl,
          username: extractUsernameFromUrl(selectedCandidate.instagramUrl, 'instagram.com/')
        });
      }

      if (selectedCandidate.xUrl) {
        socialProfiles.push({
          platform: 'X',
          url: selectedCandidate.xUrl,
          username: extractUsernameFromUrl(selectedCandidate.xUrl, 'x.com/') || extractUsernameFromUrl(selectedCandidate.xUrl, 'twitter.com/')
        });
      }

      // Build description with confidence level
      let description = selectedCandidate.description || '';
      if (selectedCandidate.confidence < 70) {
        description += ` (Confidence: ${selectedCandidate.confidence}%)`;
      }

      return {
        occupation: selectedCandidate.occupation || null,
        age: selectedCandidate.age || null,
        education: selectedCandidate.education || null,
        description: description,
        socialProfiles: socialProfiles,
        confidence: selectedCandidate.confidence,
        reasoning: selectedCandidate.reasoning,
        whatWeKnow: analysisData.whatWeKnow || [],
        whatWeMissing: analysisData.whatWeMissing || []
      };
    }

    // No strong match - use contextual inference
    if (analysisData.contextualInference) {
      return {
        occupation: null,
        age: null,
        education: null,
        description: analysisData.contextualInference.synthesizedProfile || 'Limited public information available.',
        socialProfiles: [],
        confidence: 30,
        reasoning: 'Contextual inference only - no direct identity match found',
        whatWeKnow: analysisData.whatWeKnow || [],
        whatWeMissing: analysisData.whatWeMissing || []
      };
    }

    // Fallback - no data at all
    return {
      occupation: null,
      age: null,
      education: null,
      description: 'No public information found.',
      socialProfiles: [],
      confidence: 0,
      reasoning: 'No search results or insufficient data for matching',
      whatWeKnow: [],
      whatWeMissing: []
    };

  } catch (error) {
    console.error('Error enriching customer data with Claude:', error.message);
    return {
      occupation: null,
      age: null,
      education: null,
      description: null,
      socialProfiles: [],
    };
  }
}

/**
 * Extract username from profile URL
 */
function extractUsernameFromUrl(url, pattern) {
  if (!url) return null;

  try {
    const match = url.split(pattern)[1];
    if (match) {
      return match.split('?')[0].split('/')[0];
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return null;
}
