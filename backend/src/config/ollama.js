/**
 * src/config/ollama.js
 * Local Ollama LLM integration configuration.
 * Sets up an Axios client tailored to talk to Ollama's local endpoints.
 */

import axios from 'axios';

// Base URL of the Ollama service
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Target model name in Ollama (e.g., qwen2.5, qwen, or custom qwen3)
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

const ollamaClient = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 300000, // Extension of timeout to 5 minutes to accommodate slower local Ollama generation
  headers: {
    'Content-Type': 'application/json'
  }
});

export default {
  client: ollamaClient,
  model: OLLAMA_MODEL
};
