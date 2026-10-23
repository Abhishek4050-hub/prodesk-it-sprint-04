
# LetterCraft AI — Cover Letter Generator

A responsive AI-powered cover letter generator built for Prodesk IT Sprint 4.

## Features

- Candidate details and job description form
- Phase 1 template-based generation
- Phase 2 Google Gemini integration
- Optional PDF resume text extraction
- Dark and light themes
- Copy and download cover letters
- Loading feedback and error handling
- Secure backend API key configuration

## Technologies

HTML, CSS, JavaScript, Node.js, Express, Google Gemini API,
dotenv, Multer, and pdf-parse.

## Requirements

- Node.js 18 or later
- npm
- Google AI Studio API key for AI generation

## Installation

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Install dependencies:

   npm install

4. Copy `.env.example` to `.env`.
5. Add your Gemini API key to `.env`.
6. Start the server:

   npm start

7. Open http://localhost:3000

## Testing

- Generate a letter with valid candidate details.
- Test the app without an API key to verify template mode.
- Test Gemini mode with a valid key and supported model.
- Upload a valid PDF resume.
- Try a non-PDF file and a PDF larger than 3 MB.
- Test copy, download, and dark/light mode.
- Test empty form fields and invalid API configuration.

## Security

Never commit `.env` or expose API keys in frontend JavaScript.
Use `.env.example` as a safe configuration template.

## Limitations

This is an educational MVP, not a fully production-hardened SaaS.
Add authentication, rate limiting, request quotas, and production
secret management before exposing it publicly.

## Author

Your Name

## Purpose

Prodesk IT — Sprint 4: AI Cover Letter Generator
