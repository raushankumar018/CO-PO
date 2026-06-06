/**
 * src/services/intelligence/domainDetector.js
 * Layer 3: Subject Domain Detection.
 * Identifies fine-grained domains within a category for highly targeted prompt selection.
 */

const DOMAINS = {
  COMPUTER_SCIENCE: {
    NETWORKS: 'NETWORKS',
    DATABASES: 'DATABASES',
    PROGRAMMING: 'PROGRAMMING',
    AI_ML: 'AI_ML',
    CYBER_SECURITY: 'CYBER_SECURITY',
    SOFTWARE_ENGINEERING: 'SOFTWARE_ENGINEERING',
    CLOUD_COMPUTING: 'CLOUD_COMPUTING',
    GENERAL: 'GENERAL'
  },
  MATHEMATICS: {
    ALGEBRA: 'ALGEBRA',
    STATISTICS: 'STATISTICS',
    NUMERICAL_METHODS: 'NUMERICAL_METHODS',
    GENERAL: 'GENERAL'
  },
  SCIENCE: {
    PHYSICS: 'PHYSICS',
    CHEMISTRY: 'CHEMISTRY',
    GENERAL: 'GENERAL'
  },
  COMMUNICATION: {
    GENERAL: 'GENERAL'
  },
  MANAGEMENT: {
    GENERAL: 'GENERAL'
  },
  OTHER: {
    GENERAL: 'GENERAL'
  }
};

/**
 * Classifies the specific domain within a category using rule-based keywords.
 * @param {string} category - Detected subject category.
 * @param {string} subjectName - Name of the subject.
 * @param {string} subjectCode - Course code.
 * @returns {string} - Fine-grained domain.
 */
export const detectDomain = (category, subjectName, subjectCode) => {
  const name = (subjectName || '').toLowerCase();
  const code = (subjectCode || '').toLowerCase();
  const combined = `${name} ${code}`;

  if (category === 'COMPUTER_SCIENCE') {
    if (/network|internet|protocols|routing|switch|lan\b|wan\b/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.NETWORKS;
    }
    if (/database|dbms|sql|schema|query|transaction|nosql/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.DATABASES;
    }
    if (/intelligence|machine learning|learning\b|\bml\b|\bdeep learning\b|artificial|neural|vision|nlp/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.AI_ML;
    }
    if (/security|crypto|cyber|cryptography|hack|attack|threat|firewall/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.CYBER_SECURITY;
    }
    if (/software engineering|testing|agile|scrum|devops|uml|requirements/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.SOFTWARE_ENGINEERING;
    }
    if (/cloud|virtualization|aws|azure|distributed/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.CLOUD_COMPUTING;
    }
    if (/programming|java|python|c\+\+|coding|compiler|automata|structure|data/i.test(combined)) {
      return DOMAINS.COMPUTER_SCIENCE.PROGRAMMING;
    }
    return DOMAINS.COMPUTER_SCIENCE.GENERAL;
  }

  if (category === 'MATHEMATICS') {
    if (/algebra|matrix|linear|vector/i.test(combined)) {
      return DOMAINS.MATHEMATICS.ALGEBRA;
    }
    if (/statistics|probability|stats|stochastic|random/i.test(combined)) {
      return DOMAINS.MATHEMATICS.STATISTICS;
    }
    if (/numerical|method|calculus|differential|equation|optimization/i.test(combined)) {
      return DOMAINS.MATHEMATICS.NUMERICAL_METHODS;
    }
    return DOMAINS.MATHEMATICS.GENERAL;
  }

  if (category === 'SCIENCE') {
    if (/physics|quantum|electromagnetic|optic|mechanic|solid/i.test(combined)) {
      return DOMAINS.SCIENCE.PHYSICS;
    }
    if (/chemistry|organic|inorganic|chemical|polymer/i.test(combined)) {
      return DOMAINS.SCIENCE.CHEMISTRY;
    }
    return DOMAINS.SCIENCE.GENERAL;
  }

  // Fallbacks for other categories
  const catDomains = DOMAINS[category] || DOMAINS.OTHER;
  return catDomains.GENERAL || 'GENERAL';
};
