const { GoogleGenAI, Type } = require("@google/genai");

// Initialize the Google Gen AI SDK with your API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getProjectEstimate = async (req, res) => {
  try {
    const { message, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Format previous conversations so the AI remembers context
    const formattedHistory = (chatHistory || []).map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    // We force Gemini to respond strictly in structured JSON format
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are an expert construction estimator and hardware technical assistant for FundiMart Kenya. 
        Your job is to answer the user's construction questions, estimate materials using Kenyan standards, or guide them on hardware choices.
        
        You must return your response strictly matching the following JSON structure. 
        Do not include markdown blocks like \`\`\`json.
        
        Strict JSON Structure:
        {
          "replyText": "Your helpful, expert response to the user. Use clear line breaks and bullet points directly inside the string text if necessary.",
          "recommendedCategories": ["An array of relevant categories if they need products, otherwise empty. Pick only from: Cement & Sand, Blocks & Bricks, Timber & Wood, Roofing Materials, Plumbing, Electrical, Finishing & Paint, Tools & Equipment"]
        }`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: { type: Type.STRING },
            recommendedCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["replyText", "recommendedCategories"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI engine.");
    }

    // Parse structured response cleanly
    const aiData = JSON.parse(responseText);
    
    return res.status(200).json(aiData);

  } catch (error) {
    console.error("AI Assistant Error:", error);
    return res.status(500).json({ error: "Failed to process request with AI assistant." });
  }
};

module.exports = {
  getProjectEstimate
};