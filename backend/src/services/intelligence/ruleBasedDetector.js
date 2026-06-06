/**
 * src/services/intelligence/ruleBasedDetector.js
 * Layer 1: Rule-Based Detection (Fast).
 * Detects the subject category from code, department, name, and keywords without invoking an LLM.
 */

const CATEGORIES = {
  COMPUTER_SCIENCE: 'COMPUTER_SCIENCE',
  MATHEMATICS: 'MATHEMATICS',
  SCIENCE: 'SCIENCE',
  COMMUNICATION: 'COMMUNICATION',
  MANAGEMENT: 'MANAGEMENT',
  OTHER: 'OTHER'
};

// Keyword mapping arrays for robust regex matching
const KEYWORDS = {
  [CATEGORIES.COMPUTER_SCIENCE]: [
    /computer/i, /network/i, /database/i, /dbms/i, /operating system/i,
    /programming/i, /coding/i, /java/i, /python/i, /c\+\+/i, /software/i,
    /web/i, /cloud/i, /artificial intelligence/i, /machine learning/i,
    /deep learning/i, /algorithm/i, /compiler/i, /cyber/i, /security/i,
    /data structure/i, /cryptography/i, /automata/i, /internet/i, /it\b/i
  ],
  [CATEGORIES.MATHEMATICS]: [
    /algebra/i, /mathematics/i, /math/i, /discrete/i, /numerical/i,
    /probability/i, /statistics/i, /calculus/i, /geometry/i, /differential/i,
    /linear/i, /stats\b/i, /matrix/i
  ],
  [CATEGORIES.SCIENCE]: [
    /physics/i, /chemistry/i, /thermodynamic/i, /biology/i, /mechanic/i,
    /quantum/i, /electro/i, /organic/i, /inorganic/i
  ],
  [CATEGORIES.COMMUNICATION]: [
    /english/i, /communication/i, /verbal/i, /soft skill/i, /presentation/i,
    /writing/i, /language/i, /humanities/i, /professional communication/i
  ],
  [CATEGORIES.MANAGEMENT]: [
    /management/i, /marketing/i, /financial/i, /business/i, /enterprise/i,
    /human resource/i, /organizational/i, /economics/i, /commerce/i, /finance/i
  ]
};

// Subject code prefix mappings (standard university course codes)
const CODE_PREFIXES = {
  [CATEGORIES.COMPUTER_SCIENCE]: [/CS/i, /IT/i, /MCA/i, /CSE/i],
  [CATEGORIES.MATHEMATICS]: [/MA/i, /MTH/i, /MAT/i],
  [CATEGORIES.SCIENCE]: [/PH/i, /CH/i, /PHY/i, /CHE/i, /BSC/i],
  [CATEGORIES.COMMUNICATION]: [/EN/i, /ENG/i, /HS/i],
  [CATEGORIES.MANAGEMENT]: [/MG/i, /MGT/i, /MBA/i, /MS/i, /MNG/i]
};

/**
 * Detects the subject category using metadata.
 * @param {string} subjectName - Subject name.
 * @param {string} subjectCode - Subject course code.
 * @param {string} department - Department offering the course.
 * @returns {string} - The category if detected, or 'UNKNOWN'.
 */
export const detectCategoryRuleBased = (subjectName, subjectCode, department = '') => {
  const name = subjectName || '';
  const code = subjectCode || '';
  const dept = department || '';

  // 1. Check Subject Code patterns first (strongest indicator)
  for (const [category, regexes] of Object.entries(CODE_PREFIXES)) {
    for (const regex of regexes) {
      if (regex.test(code)) {
        console.log(`[RuleBasedDetector] Classified ${code} as ${category} via subject code match.`);
        return category;
      }
    }
  }

  // 2. Check Department keywords
  if (dept) {
    if (/computer/i.test(dept) || /information technology/i.test(dept)) {
      return CATEGORIES.COMPUTER_SCIENCE;
    }
    if (/mathematics/i.test(dept) || /maths?/i.test(dept)) {
      return CATEGORIES.MATHEMATICS;
    }
    if (/physics/i.test(dept) || /chemistry/i.test(dept) || /science/i.test(dept)) {
      return CATEGORIES.SCIENCE;
    }
    if (/humanities/i.test(dept) || /english/i.test(dept) || /communication/i.test(dept)) {
      return CATEGORIES.COMMUNICATION;
    }
    if (/management/i.test(dept) || /business/i.test(dept) || /mba/i.test(dept)) {
      return CATEGORIES.MANAGEMENT;
    }
  }

  // 3. Check Subject Name keywords
  for (const [category, regexes] of Object.entries(KEYWORDS)) {
    for (const regex of regexes) {
      if (regex.test(name)) {
        console.log(`[RuleBasedDetector] Classified "${name}" as ${category} via keyword match.`);
        return category;
      }
    }
  }

  console.log(`[RuleBasedDetector] Classification for "${name}" (${code}) is UNKNOWN. Falling back to LLM...`);
  return 'UNKNOWN';
};
