import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable CORS for development (supports Live Server on port 5500, Vite, etc.)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const isPdf = file.mimetype === "application/pdf" ||
                      file.mimetype === "application/x-pdf" ||
                      (file.originalname && file.originalname.toLowerCase().endsWith(".pdf"));
        if (isPdf) {
            cb(null, true);
        } else {
            const err = new Error("Resume must be a PDF file.");
            err.status = 400;
            cb(err);
        }
    }
});

const handleUpload = (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
        upload.single("resume")(req, res, (err) => {
            if (err) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ error: "Resume file size exceeds the 3 MB limit." });
                }
                return res.status(400).json({ error: err.message || "File upload error." });
            }
            next();
        });
    } else {
        next();
    }
};

function makeTemplate({ name, role, company, skills, jobDescription = "", resumeText = "" }) {
    const skillsList = skills.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const highlightedSkills = skillsList.slice(0, 3).join(", ") || skills;

    return `Dear Hiring Manager at ${company},

I am writing to express my enthusiastic interest in the ${role} position at ${company}. With a dedicated background and demonstrated skills in ${skills}, I am eager to apply my strengths to your team's objectives.

Throughout my experience, I have developed a strong foundation in ${highlightedSkills}. I pride myself on solving complex challenges, maintaining rigorous standards of work, and collaborating productively with colleagues across diverse disciplines. The opportunity at ${company} aligns closely with my career trajectory, and I am especially excited about the prospect of contributing to your team's ongoing innovation and success.

Thank you for your consideration of my application. I would welcome the opportunity to speak with you further to discuss how my skill set, background, and dedication can add value to ${company}.

Sincerely,
${name}`;
}

const callWithTimeout = (promise, ms = 25000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI generation timed out after 25s.")), ms)
        )
    ]);
};

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash"
    });
});

app.post("/api/generate", handleUpload, async (req, res) => {
    try {
        const { name, role, company, skills, jobDescription = "" } = req.body;

        if (![name, role, company, skills].every(
            value => typeof value === "string" && value.trim()
        )) {
            return res.status(400).json({
                error: "Please fill in your name, job role, company, and skills."
            });
        }

        if (name.length > 100 || role.length > 150 ||
            company.length > 150 || skills.length > 2000 ||
            jobDescription.length > 6000) {
            return res.status(400).json({
                error: "One or more fields exceed the allowed length."
            });
        }

        let resumeText = "";

        if (req.file) {
            if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
                return res.status(400).json({
                    error: "Uploaded file is not a valid PDF."
                });
            }

            try {
                const pdf = await pdfParse(req.file.buffer);
                resumeText = (pdf.text || "").slice(0, 12000);
            } catch (pdfErr) {
                console.error("PDF parse error:", pdfErr.message);
                return res.status(400).json({
                    error: "Could not read text from the PDF file. Please ensure it is not encrypted or corrupted."
                });
            }
        }

        let letter = "";
        let mode = "demo";
        let warning = null;

        // If Gemini API key is present, attempt AI generation
        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({
                    apiKey: process.env.GEMINI_API_KEY
                });

                const prompt = `
Write a polished, professional cover letter using the details below.

Candidate: ${name}
Target role: ${role}
Company: ${company}
Skills: ${skills}
Job description: ${jobDescription || "Not provided"}
Resume text: ${resumeText || "Not provided"}

Rules:
- Write in first person and use professional, natural language.
- Tailor the letter to the role and company.
- Use relevant skills and experience from the supplied information.
- Never invent degrees, employers, achievements, years of experience, or metrics.
- If a detail is missing, do not make it up.
- Return only the cover letter, with paragraphs separated by blank lines.
- Do not include Markdown headings or a code block.
`;

                const response = await callWithTimeout(
                    ai.models.generateContent({
                        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
                        contents: prompt,
                        config: {
                            systemInstruction:
                                "You are a professional career-writing assistant. Follow the supplied facts accurately.",
                            maxOutputTokens: 1200,
                            temperature: 0.7
                        }
                    }),
                    25000
                );

                letter = response.text?.trim();
                if (!letter) {
                    throw new Error("AI returned empty response.");
                }
                mode = "ai";
            } catch (aiErr) {
                console.error("AI Generation issue:", aiErr.message || aiErr);
                letter = makeTemplate({ name, role, company, skills, jobDescription, resumeText });
                mode = "demo";
                warning = (aiErr.message && (aiErr.message.includes("503") || aiErr.message.includes("demand")))
                    ? "Gemini AI is experiencing high demand. Generated using smart template fallback."
                    : "Gemini AI was unavailable. Generated using smart template fallback.";
            }
        } else {
            letter = makeTemplate({ name, role, company, skills, jobDescription, resumeText });
            mode = "demo";
        }

        res.json({ letter, mode, warning });
    } catch (error) {
        console.error("Request error:", error.message || error);
        res.status(500).json({
            error: error.message || "Generation failed. Check server logs."
        });
    }
});

// Fallback error handler
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    console.error("Express error handler:", error.message || error);
    const status = error.status || 500;

    res.status(status).json({
        error: error.message || "Internal server error."
    });
});

app.listen(PORT, () => {
    console.log(`LetterCraft AI running at http://localhost:${PORT}`);
});
