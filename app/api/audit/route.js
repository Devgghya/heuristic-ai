import Groq from "groq-sdk";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Ensure Node.js runtime for Buffer and database libraries
export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

export async function POST(req) {
  try {
    const { userId } = await auth(); // Get User ID (might be null if Guest)
    
    const formData = await req.formData();
    const files = formData.getAll("file");
    const framework = formData.get("framework") || "nielsen";
    const mode = formData.get("mode") || "upload";
    const url = formData.get("url");

    // 1. Handle Input (File vs URL)
    let base64 = "";
    let mimeType = "";
    let publicImageUrl = "";
    const images = [];

    if (mode === "url" && url || mode === "accessibility" && url) {
      // Helper to capture a single URL
      // Check if URL starts with http
      const normalizeUrl = (u) => {
          if (!u.startsWith("http")) return "https://" + u;
          return u;
      }
      const targetUrl = normalizeUrl(url);

      const captureScreenshot = async (tUrl) => {
         // Reduced resolution to 1024x768 to prevent payload bloat
         const sUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(tUrl)}?w=1024&h=768`;
         let attempts = 0;
         while(attempts < 5) {
            if (attempts > 0) await new Promise(r => setTimeout(r, 2000));
            try {
               const res = await fetch(sUrl);
               const ab = await res.arrayBuffer();
               if (ab.byteLength > 6000) {
                  return { base64: Buffer.from(ab).toString("base64"), mimeType: "image/jpeg", publicUrl: sUrl };
               }
            } catch(e) {}
            attempts++;
         }
         return null;
      };

      if (url) {
         images.push(await captureScreenshot(targetUrl)); // Always get main URL
      }
      
      if (images[0] === null) return NextResponse.json({ error: "Failed to capture main URL", error_code: "SCREENSHOT_FAILED" }, { status: 500 });
      
      // Update global vars for single image compat check later
      base64 = images[0].base64;
      mimeType = images[0].mimeType;
      publicImageUrl = images[0].publicUrl;
    } else if (mode === "crawler" && url) {
        // CRAWLER MODE
        // 1. Fetch HTML to find links
        try {
           const normalizeUrl = (u) => {
               if (!u.startsWith("http")) return "https://" + u;
               return u;
           }
           const targetUrl = normalizeUrl(url);

           const htmlRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (AuditBot/1.0)' }});
           const html = await htmlRes.text();
           
           // 2. Extract Internal Links
           const baseDomain = new URL(targetUrl).hostname;
           const links = new Set();
           const regex = /href=["']((?:https?:\/\/[^"']+|(?:\/[^"']*)))["']/g;
           let match;
           while ((match = regex.exec(html)) !== null) {
               try {
                   const absoluteUrl = new URL(match[1], targetUrl).href;
                   // Filter: Internal only, not the same as root, no fragments
                   if (new URL(absoluteUrl).hostname === baseDomain && absoluteUrl !== targetUrl && !absoluteUrl.includes("#")) {
                       links.add(absoluteUrl);
                   }
               } catch (e) {}
           }
           
           // 3. Select Top 3 Links (Prioritize common pages)
           const priorityWords = ['pricing', 'about', 'features', 'contact', 'login', 'signup'];
           const sortedLinks = Array.from(links).sort((a, b) => {
               const aScore = priorityWords.some(w => a.toLowerCase().includes(w)) ? 1 : 0;
               const bScore = priorityWords.some(w => b.toLowerCase().includes(w)) ? 1 : 0;
               return bScore - aScore;
           });
           // Limit to Root + 2 subpages (Max 3 total) to stay within AI limits
           const targets = [targetUrl, ...sortedLinks.slice(0, 2)]; 

           // 4. Batch Screenshot
           const capture = async (tUrl) => {
                const sUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(tUrl)}?w=1024&h=768`;
                 // Shorter retry for crawler to avoid timeout
                let attempts = 0;
                while(attempts < 4) {
                   if (attempts > 0) await new Promise(r => setTimeout(r, 2500));
                   try {
                      const res = await fetch(sUrl);
                      const ab = await res.arrayBuffer();
                      if (ab.byteLength > 6000) {
                         return { base64: Buffer.from(ab).toString("base64"), mimeType: "image/jpeg", publicUrl: sUrl };
                      }
                   } catch(e) {}
                   attempts++;
                }
                return null;
           };
           
           // Parallel execution
           const results = await Promise.all(targets.map(t => capture(t)));
           const validResults = results.filter(r => r !== null);
           
           if (validResults.length === 0) return NextResponse.json({ error: "Failed to crawl site", error_code: "CRAWL_FAILED" }, { status: 500 });
           
           validResults.forEach(img => images.push(img));
           
           // Set primaries for compatibility
           base64 = images[0].base64;
           mimeType = images[0].mimeType;
           publicImageUrl = images[0].publicUrl;

        } catch (e) {
             console.error("Crawl error:", e);
             return NextResponse.json({ error: "Failed to access site URL: " + e.message, error_code: "FETCH_FAILED" }, { status: 400 });
        }

    } else if (files && files.length > 0) {
      // Handle File Upload
      for (const fileObj of files) {
        const bytes = await fileObj.arrayBuffer();
        const b64 = Buffer.from(bytes).toString("base64");
        const mt = fileObj.type;

        let blobUrl = "";
        if (userId) {
          try {
            const blob = await put(fileObj.name, fileObj, { access: 'public' });
            blobUrl = blob.url;
          } catch {}
        }
        images.push({ base64: b64, mimeType: mt, publicUrl: blobUrl });
      }
      // Use the first image as primary for legacy fields
      if (images.length > 0) {
        base64 = images[0].base64;
        mimeType = images[0].mimeType;
        publicImageUrl = images[0].publicUrl;
      }
    } else {
      return NextResponse.json({ error: "No content to analyze", error_code: "NO_INPUT" }, { status: 400 });
    }

    // 2. AI Analysis
    if (!GROQ_API_KEY || !groq) {
      return NextResponse.json({ error: "Groq API key missing or client unavailable", error_code: "MISSING_GROQ" }, { status: 500 });
    }
    if (!base64 || !mimeType) {
      return NextResponse.json({ error: "Invalid input image or URL", error_code: "INVALID_INPUT" }, { status: 400 });
    }
    const prompt = `
      You are a Lead UX Auditor conducting an official heuristic evaluation of ${mode === 'crawler' ? 'a multi-page website scan' : (mode === 'url' ? 'a live website homepage' : 'UI screenshots')}.
      ${mode === 'accessibility' ? `
      SPECIAL MODE: ACCESSIBILITY PERSONA TESTING
      Your task is to audit this interface exclusively through the lens of WCAG 2.1 AA/AAA standards, simulating the experience of disabled users.
      
      REQUIRED PERSONAS (Simulate these specific user flows):
      1. **Low Vision User (Maria)**: Uses 200% zoom. Needs high contrast (4.5:1 min) and clear visual hierarchy. Cannot rely on color alone.
      2. **Screen Reader User (Ali)**: Cannot see the screen. Relies on logical reading order, headings, and inferred ARIA roles. (Deduce semantic structure from visual layout).
      3. **Motor Impairment (Sam)**: Uses keyboard only. Needs large clickable targets (min 44x44px) and clear focus indicators. Cannot perform complex drag/dro or hover-only actions.
      ` : `Your task is to produce a critical, professional audit report based STRICTLY on the **${framework}** framework.`}
      
      CRITICAL INSTRUCTIONS:
      1. **Framework Adherence**: Every issue must directly violate a specific principle of **${framework}**. Cite the principle if possible.
      2. **Professional Tone**: Write in a formal, objective tone suitable for a boardroom presentation. Avoid casual language.
      3. **Visual Evidence**: You must analyze specific pixels (buttons, text, white space). Do not hallucinate features. If you can't see it, don't report it.
      4. **Detailed Findings**: "Make the logo bigger" is bad. "The 24px logo lacks sufficient whitespace (4px) relative to the header height (80px), violating hierarchy principles" is good.
      
      JSON Schema (MUST follow exactly):
      {
        "images": [
          {
            "index": 0,
            "ui_title": "Professional descriptive title (e.g., 'Primary Landing Page', 'User Dashboard')",
            "audit": [
              {
                "title": "Concise, professional issue title (e.g., 'Violation of Consistency caused by mismatched button styles')",
                "issue": "Detailed analysis. Describe the visual element, explain WHY it fails the ${framework} heuristic, and the impact on the user.",
                "solution": "Professional recommendation. Specify exact changes (hex codes, pixel values, layout shifts) to align with standards.",
                "severity": "critical" | "high" | "medium" | "low",
                "category": "Navigation" | "Typography" | "Accessibility" | "Layout" | "Color" | "Consistency" | "Hierarchy" | "Visual Feedback" | "Error Prevention" | "User Control"
              }
            ]
          }
        ],
        "summary": {
          "ui_title": "Executive Summary",
          "audit": [
            {
              "title": "Major Strategic Concern",
              "issue": "Synthesis of the most critical structural or systemic failure found across the interface.",
              "solution": "High-level strategic recommendation.",
              "severity": "critical" | "high" | "medium" | "low",
              "category": "Relevant category"
            }
          ]
        }
      }

      Example Output (Style Guide):
      {
        "images": [
           {
             "index": 0,
             "ui_title": "Homepage Hero Section",
             "audit": [
               {
                 "title": "Lack of System Visibility (Heuristic #1)",
                 "issue": "The 'Submit' action provides no immediate visual feedback. The user is left unsure if the request was processed, violating the principle of Visibility of System Status.",
                 "solution": "Implement a loading spinner inside the button upon click and a subsequent toast notification relative to the viewport top-right.",
                 "severity": "high",
                 "category": "Visual Feedback"
               }
             ]
           }
        ],
        "summary": {
           "ui_title": "Executive Summary",
           "audit": [
             {
               "title": "Inconsistent Navigation Structure",
               "issue": "Navigation elements shift location between views, increasing cognitive load and violating Consistency and Standards.",
               "solution": "Standardize the global navigation bar height to 64px and lock position across all child pages.",
               "severity": "critical",
               "category": "Navigation"
             }
           ]
        }
      }
      
      Analysis Requirements:
      1. Identify at least 5-8 **distinct** visual issues.
      2. Severity 'Critical' means the user CANNOT complete a task. 'High' means the user is significantly delayed or frustrated.
      3. Focus on what is visible: alignment, contrast, spacing, font hierarchy, affordances (do buttons look like buttons?).
      
      ${mode === 'url' ? 'Context: This is a screenshot of a live URL. Evaluate the visible portion of the viewport.' : ''}
    `;
    
    let result;
    try {
      // Build messages with image support for Llama 4 Scout vision model
      // The last message must use array format with image_url
      const userMessageContent = [
        { type: "text", text: prompt },
        ...images.map((img) => ({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64}`
          }
        }))
      ];
      
      result = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a Senior UX Researcher specializing in UI/UX audits. Always return valid JSON with no markdown formatting."
          },
          {
            role: "user",
            content: userMessageContent
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
    } catch (modelErr) {
      console.error("Groq API error:", modelErr);
      const reason = typeof modelErr?.message === "string" ? modelErr.message : "unknown";
      const status = typeof modelErr?.status === "number" ? modelErr.status : 502;
      let userMessage = status === 429 ? "AI quota exceeded. Please wait and try again." : "Model inference failed";
      
      if (status === 413 || reason.includes("too large") || reason.includes("payload")) {
          userMessage = "The analysis payload is too large. Trying scanning fewer pages.";
      }
      
      return NextResponse.json({ error: userMessage, error_code: "MODEL_ERROR", error_reason: reason }, { status });
    }

    const responseText = (result.choices[0]?.message?.content ?? "").toString().replace(/```json|```/g, "").trim();
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("AI JSON parse error:", parseErr, responseText);
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    // 3. Save to Database (ONLY IF LOGGED IN) — save each image record separately
    if (userId && images.length > 0 && parsedData?.images) {
      try {
        for (let i = 0; i < images.length; i++) {
          const group = parsedData.images.find((g) => g.index === i);
          const urlToSave = images[i].publicUrl || null;
          if (group) {
            await sql`
              INSERT INTO audits (user_id, ui_title, image_url, framework, analysis)
              VALUES (${userId}, ${group.ui_title}, ${urlToSave}, ${framework}, ${JSON.stringify(group.audit)})
            `;
          }
        }
      } catch (dbError) {
        console.error("DB Save Failed:", dbError);
        // Don't crash the request if DB fails, just return the analysis
      }
    }

    // Aggregate flat audit for backward compatibility
    // Prioritize detailed findings from 'images' array over the 'summary'
    const detailedAudits = Array.isArray(parsedData?.images) 
      ? parsedData.images.flatMap((g) => g.audit || []) 
      : [];

    const flatAudit = detailedAudits.length > 0 
      ? detailedAudits 
      : (Array.isArray(parsedData?.summary?.audit) ? parsedData.summary.audit : []);

    // BACKWARD COMPATIBILITY: Map new schema (title, issue, solution) to old schema (title, critique, fix)
    const normalizedAudit = flatAudit.map(item => ({
       title: item.title || item.issue?.substring(0, 50) + "..." || "Issue Detected",
       issue: item.issue || item.critique || "No description provided",
       solution: item.solution || item.fix || "No solution provided",
       critique: item.issue || item.critique || "No description provided", // Old field
       fix: item.solution || item.fix || "No solution provided",          // Old field
       severity: item.severity || "medium",
       category: item.category || "General"
    }));

    return NextResponse.json({ 
      success: true, 
      ui_title: parsedData?.summary?.ui_title || parsedData?.images?.[0]?.ui_title || "Untitled Scan",
      audit: normalizedAudit,
      analysis_grouped: parsedData?.images || null,
      image_url: publicImageUrl || null
    });

  } catch (error) {
    console.error("Server Error:", error);
    // Try to surface a minimal reason without leaking sensitive data
    const message = typeof error?.message === "string" ? error.message : "Unknown error";
    return NextResponse.json({ error: "Analysis failed. Try again.", error_code: "SERVER_ERROR", error_reason: message }, { status: 500 });
  }
}