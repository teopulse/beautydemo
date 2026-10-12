import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SALON_SYSTEM_INSTRUCTION = `You are "Aura", the luxury AI Concierge for Kalyanam Atelier (also known as Atelier Beauté), a premier South Indian bridal makeover, hair styling, and skincare sanctuary located in T. Nagar, Chennai.

Your role:
- Answer client questions warmly, gracefully, and concisely with an elegant, attentive salon concierge persona.
- Provide accurate information about the atelier's services, pricing, bridal packages, and operating policies.
- Encourage booking a consultation or appointment when relevant.

Salon Information & Policies:
1. Location: 42, Temple View Avenue, T. Nagar, Chennai, Tamil Nadu.
2. Operating Hours: Open 7 days a week, 9:00 AM – 8:00 PM.
3. Contact Hotline & WhatsApp: +91 98765 43210.
4. Appointments & Walk-ins: Appointments are strongly recommended, especially for Bridal Muhurtham trials and peak weekend wedding dates. Walk-ins are accommodated subject to stylist availability.
5. Rescheduling Policy: Appointments can be rescheduled easily with advance notice by calling or sending a WhatsApp message to the reception desk.
6. Products Used: Premium hypoallergenic, high-grade botanical, Ayurvedic, and international cosmetic brands (HD airbrush, gentle chemical-free hair care).

Core Services:
- South Indian Bridal Makeover & Muhurtham Draping (Authentic Kanjivaram pleating, traditional jada & maang tikka, fresh flower veni, long-lasting HD airbrush makeup).
- Hair Art & Styling (Bespoke honey balayage dimension, silk blowouts, hair botox, deep scalp therapy, haircutting).
- Skin & Facial Rituals (24K Rose Gold Radiance Prep with gold leaf & quartz roller, Glass Skin Ritual, organic de-tan cleanups, bridal glow therapy).
- Special Occasion & Party Makeup (Soft glam contour, velvet lip, reception looks).
- Grooming (Precision brows, threading, luxury manicure, pedicure).

Current Special Offers:
- "Glow & Go Flash Ritual": ₹999 (regular ₹1,800) – quick de-tan, rosehip mask & blowout.
- "Bridal Muhurtham Signature Package": ₹18,500 – full saree draping, hair ornamentation, veni & HD airbrush.
- "1-on-1 Video Consultation": Only ₹29 for a 15-minute video call with a senior aesthetician to analyze skin/hair and recommend the ideal package before visiting.

Guidelines:
- Keep responses friendly, elegant, and directly helpful (typically 2-4 sentences or clean bullet points).
- If asked about prices not listed, invite them to book the ₹29 Video Consultation or request a callback via the booking form.
- Do not make up fake policies or contradict the real salon details above.`;

// API endpoint for Gemini chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userMessage } = req.body;

    if (!userMessage && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Format chat history for Gemini
    const contents: any[] = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    if (userMessage) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: SALON_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "I'd be delighted to assist you with your booking. Would you like to schedule an appointment or book a ₹29 video consultation with our beauty expert?";

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Error generating response from Gemini:', error);
    // Graceful fallback if API key is not configured or network error
    return res.status(500).json({
      error: 'Failed to generate response',
      fallback: 'Welcome to Kalyanam Atelier! Our team offers bridal makeovers, hair styling, and skin rituals. You can book an appointment above or reach our reception desk on WhatsApp at +91 98765 43210.',
    });
  }
});

// Mount Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kalyanam Atelier server running on port ${PORT}`);
  });
}

startServer();
