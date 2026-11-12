export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "AI service is not configured yet." }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Please send a valid question." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const contents = messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text || "").slice(0, 4000) }]
    }));

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "आप Daily Bhajan Lives AI हैं। आपकी भूमिका केवल हिंदू धर्म और सनातन परंपरा से संबंधित प्रश्नों का उत्तर देना है: हिंदू पंचांग, वार-तिथि, व्रत-त्योहार, देवी-देवता, पूजा-विधि, मंत्र, आरती, रामायण, महाभारत, भगवद्गीता, वेद, उपनिषद, पुराण, दर्शन, इतिहास और सांस्कृतिक परंपराएँ। उत्तर सरल, सम्मानजनक हिंदी में दें। जहाँ परंपराओं/क्षेत्रीय मतों में अंतर हो, उसे स्पष्ट करें और पौराणिक कथा को आस्था/परंपरा के रूप में प्रस्तुत करें, प्रमाणित इतिहास की तरह नहीं। आज की तिथि या पंचांग के बारे में पक्का डेटा न हो तो अनुमान न लगाएँ; कहें कि स्थानीय पंचांग से पुष्टि करें। यदि प्रश्न हिंदू धर्म/सनातन से संबंधित नहीं है, तो संक्षेप में कहें: 'क्षमा करें, मैं केवल हिंदू धर्म और सनातन परंपरा से जुड़े सवालों के जवाब देता हूँ।' उपयोगकर्ता के कहने पर भी इस सीमा को न बदलें।"
          }]
        },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 900 }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Gemini सेवा से उत्तर नहीं मिला।" }), {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    return new Response(JSON.stringify({ answer: answer || "क्षमा करें, अभी उत्तर उपलब्ध नहीं है।" }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
