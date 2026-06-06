/**
 * src/utils/jsonParser.js
 * Centralized, self-healing JSON parsing utility.
 * Attempts to parse, clean, and repair malformed or truncated JSON outputs from LLM responses.
 */

/**
 * Parses and repairs common LLM JSON output flaws (e.g. truncated closing brackets/braces).
 * 
 * @param {string} str - Raw response string from the LLM.
 * @returns {Object|Array} - Parsed JSON object or array.
 */
export const cleanAndParseJSON = (str) => {
  let cleanStr = (str || '').trim();

  // 1. Remove markdown wrapper if present (e.g. ```json ... ```)
  cleanStr = cleanStr.replace(/^```json\s*/i, '');
  cleanStr = cleanStr.replace(/```$/, '');
  cleanStr = cleanStr.trim();

  // 2. Try parsing directly
  try {
    return JSON.parse(cleanStr);
  } catch (err) {
    console.warn('[JSONParser] Direct parse failed, attempting auto-repair. Error:', err.message);

    // 3. Attempt simple character repairs (missing closing object brace)
    if (cleanStr.startsWith('{') && !cleanStr.endsWith('}')) {
      if (cleanStr.endsWith(']')) {
        cleanStr += '}';
      } else {
        // Try appending up to two closing braces if it was deeply nested
        try { return JSON.parse(cleanStr + '}'); } catch (e) {}
        try { return JSON.parse(cleanStr + ']}'); } catch (e) {}
        try { return JSON.parse(cleanStr + '}}'); } catch (e) {}
      }
    }

    // 4. Try parsing directly after repair
    try {
      return JSON.parse(cleanStr);
    } catch (e) {
      // 5. Try regex-based block extraction
      const isArray = cleanStr.startsWith('[');
      const regex = isArray ? /\[[^]*\]/ : /\{[^]*\}/;
      const match = cleanStr.match(regex);
      
      if (match) {
        const matchedBlock = match[0];
        try {
          return JSON.parse(matchedBlock);
        } catch (innerErr) {
          console.warn('[JSONParser] Regex block parse failed, attempting deep repairs on matched block...');
          
          // Deep repair on matched block
          let repaired = matchedBlock;
          if (isArray && !repaired.endsWith(']')) repaired += ']';
          if (!isArray && !repaired.endsWith('}')) repaired += '}';
          
          try {
            return JSON.parse(repaired);
          } catch (deepErr) {
            // Last ditch: strip trailing commas or resolve double braces
            try {
              let sanitized = repaired.replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas
              return JSON.parse(sanitized);
            } catch (lastErr) {
              throw new Error(`Failed to parse repaired JSON block. Matched: "${matchedBlock}". Error: ${deepErr.message}`);
            }
          }
        }
      }
      
      throw err; // Throw the original parse error if regex matched nothing
    }
  }
};
