# UIXScore: The Complete Handbook ⚡️

UIXScore is a state-of-the-art, AI-driven design auditing platform designed to bridge the gap between subjective design opinion and objective, data-driven usability standards. It empowers designers, developers, and product managers to identify UX issues, accessibility gaps, and strategic opportunities in seconds.

---

## 1. What is UIXScore?

UIXScore is more than just a scoring tool; it is a **"World-Class UX Consultant & Information Designer"** available 24/7. It leverages advanced Large Language Models (LLMs) to perform deep visual and structural analysis of user interfaces.

### Core Philosophy: The Two-Tiered Analysis
UIXScore distinguishes its findings into two critical levels of depth:
1.  **Strategic Audit**: High-level insights focused on business impact, information architecture, brand trust, and overall flow. This is designed for stakeholders and executives.
2.  **Technical/Granular Audit**: Specific UI/UX findings focused on colors, typography, alignment, contrast ratios, and component-level usability. This is designed for designers and developers.

---

## 2. How it Works: The Audit Process

### Step 1: Input Methods
Users can provide input to UIXScore in four distinct ways:
*   **Image Upload**: Drag and drop screenshots of your designs (PNG, JPG, etc.).
*   **Live URL Capture**: Provide a URL, and UIXScore captures a high-resolution screenshot automatically.
*   **Site Crawler**: A deep-scan mode that crawls a primary URL and automatically audits related pages (like Pricing, About, or Features) to find regressions across the site.
*   **Accessibility Persona Testing**: A specialized mode that tests the UI through the lens of specific WCAG 2.1 AA/AAA personas (e.g., low-vision, keyboard-only, or screen reader users).

### Step 2: Selecting a Framework
UIXScore allows users to choose the lens through which the AI analyzes the design:
*   **Nielsen's Heuristics**: The industry standard for usability (Visibility of system status, Match between system and real world, etc.).
*   **WCAG 2.1**: Focused strictly on accessibility and inclusivity.
*   **Gestalt Principles**: Focused on cognitive psychology and how users perceive visual patterns (Proximity, Similarity, Continuity, etc.).

### Step 3: AI Engine Analysis
The analysis is powered by **meta-llama/llama-4-scout-17b-16e-instruct** via the **Groq** cloud. The system processes the visual data (base64) alongside a specialized prompt that forces the AI to categorize findings by severity and impact.

---

## 3. Understanding the Results

### The UIXScore (0-100)
Every audit produces a numerical score based on five core performance metrics:
1.  **Clarity**: How easy is it to understand the purpose of the page?
2.  **Efficiency**: How quickly can a user complete their task?
3.  **Consistency**: Are elements uniform across the interface?
4.  **Aesthetics**: Is the visual design professional and balanced?
5.  **Accessibility**: Does the design meet inclusivity standards?

### Detailed Findings
Each issue identified is categorized by:
*   **Severity**: Critical (Fix immediately), High, Medium, Low.
*   **Problem**: A clear explanation of what is wrong (e.g., "Contrast ratio failure on primary button").
*   **Solution**: Actionable advice on how to fix the issue (e.g., "Increase background darkness to #222").

---

## 4. Pricing & Subscription Plans

UIXScore follows a freemium model with tiered access levels to suit individuals and large agencies.

| Tier | Price (Monthly) | Price (Annual) | Features & Limits |
| :--- | :--- | :--- | :--- |
| **Guest** | Free | N/A | 1 Audit total (tracked by IP). No history. |
| **Free (Logged In)** | Free | N/A | 3 Audits per month. Basic 2k token limits. |
| **Pro Analyst** | **$6 / ₹499** | **~$4.80** (20% off) | 60 Audits/mo, All Frameworks, PDF Reports, Unlimited History, 4k token limit. |
| **Design Studio** | **$30 / ₹2499** | **~$24** (20% off) | **Unlimited Audits**, Priority Processing, Team Dashboard, 8k token limit. |
| **Enterprise** | **Contact** | Custom | White-label Reports, API Access, Custom Integrations, Dedicated Support. |

---

## 5. Advanced Features

*   **Official PDF Reports**: Users can export a professionally styled PDF report containing the Executive Summary, the Radar Chart of metrics, and the full list of detailed findings. These reports are "client-ready."
*   **Competitor Benchmarking**: Users can audit two different sites and compare their scores and metrics side-by-side to understand market positioning.
*   **Cloud History**: Signed-in users have access to a secure dashboard where they can revisit past audits, deletion management, and trend tracking.
*   **Admin Console**: A restricted area for the platform owner to monitor user growth, audit usage, and revoke/manage subscriptions.

---

## 6. Technical Specifications

*   **Frontend**: Next.js 15 (App Router) with Tailwind CSS 4.
*   **Auth**: Clerk (Secure authentication and user management).
*   **Database**: Vercel Postgres (Neon) for storing audits and usage data.
*   **Storage**: Vercel Blob for secure image hosting.
*   **Payments**: Integrated with Razorpay (India) and Lemon Squeezy (International).

---

*This document serves as the primary source of truth for the UIXScore platform as of February 2026.*
