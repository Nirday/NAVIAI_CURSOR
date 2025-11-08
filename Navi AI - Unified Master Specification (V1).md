\# Navi AI \- Unified Master Specification (V2)

\*\*Document Purpose:\*\* This document serves as the single, definitive blueprint for building the V1 Navi AI platform. It incorporates essential features discussed and is intended for use with an AI code editor (e.g., Cursor), outlining the overall vision, architecture, and detailed implementation steps for each core module.

\*\*Target Audience (End User):\*\* Non-technical owners of local Small-to-Medium Businesses (SMBs).

\*\*Core Product Vision:\*\* Navi AI is an AI-powered, conversational platform designed to simplify and automate the essential online marketing and business management tasks for SMBs. The primary interface is a chat assistant, making powerful tools accessible through plain English commands. The platform aims to act as an automated marketing team, website manager, SEO expert, social media manager, and customer relationship hub, allowing business owners to focus on their core services while Navi AI handles their online presence and growth.

\*\*Key Architectural Principles:\*\*  
\* \*\*Conversational First:\*\* The primary user interaction model is through the central AI Chat Orchestrator (Module 1).  
\* \*\*Modularity:\*\* The platform is composed of distinct modules, each responsible for a specific domain (Website, SEO, Social, etc.).  
\* \*\*Shared Core Services:\*\* Common functionalities like managing third-party connections (OAuth), running scheduled jobs, and handling inter-module communication (Action Queue) should be implemented as central, reusable services to avoid duplication.  
\* \*\*AI-Driven Automation:\*\* Leverage AI extensively to automate content creation, optimization, analysis, and communication, minimizing manual effort for the user.  
\* \*\*Human-Centric Design:\*\* Prioritize simplicity, clarity, and user trust in all interfaces and interactions. Provide guidance and proactive suggestions.

\---

\#\# \*\*Instructions for the AI Code Editor (Cursor)\*\*

\*\*Read this ENTIRE document first\*\* to understand the overall vision and how the modules interconnect.

\*\*Implementation Workflow:\*\* You will implement the modules sequentially, starting with Module 1\. For \*\*EACH TASK\*\* within \*\*EACH MODULE\*\*, you \*\*MUST\*\* follow the \*\*Collaborative Workflow Mandate\*\*:

1\.  Read the \*\*"Collaborative Checkpoint"\*\* instructions for the specific task.  
2\.  \*\*STOP.\*\* Do \*\*NOT\*\* write any code yet.  
3\.  \*\*Engage the User (Project Director):\*\*  
    \* Clearly state your understanding of the task's goal based on the specification.  
    \* Ask the specific \*\*"Clarifying Questions"\*\* listed in the checkpoint.  
    \* \*\*Await explicit confirmation and approval\*\* from the user for both your understanding and their answers to your questions.  
4\.  \*\*Proceed with Code Generation:\*\* Only after receiving user approval, generate the code strictly following the \*\*"Detailed Implementation Steps"\*\* and \*\*"AI Prompt Guidance"\*\* (if applicable) for that task. Ensure all code adheres to the \*\*"Master Implementation Guide & Overarching Principles"\*\* for the relevant module.

\*\*Your primary goal is not just to generate code, but to collaborate with the user to ensure the implementation perfectly matches the nuanced, human-centric vision detailed in this specification.\*\*

\---

\#\# Module 1 Master Specification V4: Conversational AI Core

This document is the definitive technical specification and implementation guide for the \*\*Conversational AI Core\*\* module. This version incorporates the consultant persona, website scraping, flexible data model, proactive suggestions, error handling, confirmation loops, the "Aha\!" moment, \*\*and persistent chat history\*\*.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Conversation is the primary interface; Build trust via transparency; Guided and proactive interaction; \*\*Chat history is accessible\*\*.  
\* \*\*AI Persona & Logic:\*\* Expert Consultant Persona; Stateful conversation; Disambiguation is key.  
\* \*\*Code & Architecture:\*\* Orchestrator is the brain; Flexible data model (JSONB); Separate concerns; \*\*Chat history storage\*\*.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 1.1: Define Core Data Structures (ENHANCED)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand, Ask about \`customAttributes\` flexibility, Ask about \`ChatMessage\` storage needs (index?), Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/types.ts\`  
\* \*\*Goal:\*\* Define interfaces for \`BusinessProfile\`, \`ChatMessage\`, \*\*and persistent storage\*\*.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Define the \`BusinessProfile\` interface (including \`customAttributes: { label: string; value: string; }\[\]\`).  
    2\.  Define the \`ChatMessage\` interface:  
        \`\`\`typescript  
        export interface ChatMessage {  
          messageId?: string; // Optional: Added if storing persistently  
          userId: string; // Added for storage  
          role: 'user' | 'assistant';  
          content: string;  
          timestamp: Date; // Added for storage  
        }  
        \`\`\`  
\* \*\*Key Considerations:\*\* Supabase \`business\_profiles\` table needs dedicated columns and a \`jsonb\` column. \*\*A new \`chat\_messages\` table is required\*\* (\`messageId\`, \`userId\`, \`role\`, \`content\`, \`timestamp\`) with appropriate indexing on \`userId\` and \`timestamp\`.

\#\#\#\# \*\*Task 1.2: Implement Business Profile Management\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand CRUD functions, Ask about merge logic for updates, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/profile.ts\`  
\* \*\*Goal:\*\* Create core CRUD functions (\`getProfile\`, \`createProfile\`, \`updateProfile\`, \`deleteProfile\`).  
\* \*\*Detailed Implementation Steps:\*\* Implement Supabase queries for each function. Ensure \`updateProfile\` intelligently merges nested data (like \`services\` array, \`customAttributes\` array) rather than overwriting.

\#\#\#\# \*\*Task 1.3: Implement Website Scraper for Onboarding\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand scraper goal, Ask about specific fields to prioritize extraction for, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/scraper.ts\`  
\* \*\*Goal:\*\* Create tool to extract profile info from a URL.  
\* \*\*Detailed Implementation Steps:\*\* Implement \`scrapeWebsiteForProfile(url)\` using a scraping library (e.g., Cheerio for static, Puppeteer for dynamic) to get text content, then pass text to AI for extraction.  
\* \*\*AI Prompt Guidance:\*\* Instruct AI as "data extraction expert." Require JSON output matching \`Partial\<BusinessProfile\>\`, extracting fields like name, services, location if found.

\#\#\#\# \*\*Task 1.4: Implement the AI Orchestrator (ENHANCED)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand orchestrator's central role \+ history saving, Ask about initial onboarding question wording, Ask about handling ambiguous intents, Ask about error message phrasing, Ask about history retrieval limit, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/orchestrator.ts\`  
\* \*\*Goal:\*\* Create the central, stateful conversational engine \*\*that saves and utilizes chat history\*\*.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Implement main function \`processUserMessage(userId: string, message: string): Promise\<string\>\`. \*\*This function now fetches recent history internally.\*\*  
    2\.  \*\*Fetch History:\*\* Before processing, fetch the last N (e.g., 20\) \`ChatMessage\` records for the \`userId\` from the \`chat\_messages\` table. This becomes the \`conversationHistory\`.  
    3\.  \*\*State Management:\*\* Maintain \`conversationHistory\` for the duration of the request.  
    4\.  \*\*Onboarding Logic:\*\* (Same as previous version \- check profile, run interview/scrape).  
    5\.  \*\*Intent Recognition:\*\* Use AI call with the \*new message\* \+ \*fetched history\*.  
    6\.  \*\*AI Prompt Guidance:\*\* "You are an AI assistant orchestrator... Analyze the user's message... Determine intent (e.g., UPDATE\_PROFILE, USER\_CORRECTION, CREATE\_WEBSITE, GET\_SUGGESTIONS)... Extract relevant entities... Determine if clarification is needed. Respond in JSON: \`{ intent: '...', entities: {...}, needsClarification: boolean, clarificationQuestion: '...' }\`".  
    7\.  \*\*Handle Intents:\*\* Use a \`switch\` statement.  
        \* \`USER\_CORRECTION\`: Respond apologetically, ask for correction (e.g., "My apologies\! Let's fix that. What should I change?").  
        \* \`UPDATE\_PROFILE\`: Extract entities, call \`updateProfile\`. Formulate confirmation summary (e.g., "Okay, I've updated your hours... Does that look right?").  
        \* \`CREATE\_WEBSITE\`, \`WRITE\_BLOG\`, etc.: Call RAG (Task 1.5) to get relevant profile context. Dispatch action command (using central Action Queue \- defined later) to the appropriate module, passing context.  
        \* If \`needsClarification\`, return the \`clarificationQuestion\`.  
    8\.  \*\*Save Messages:\*\* \*\*Crucially\*\*, before returning the final response, save both the user's incoming message and the AI's outgoing response as new \`ChatMessage\` records in the \`chat\_messages\` table.  
    9\.  Return the AI's response or confirmation message.  
\* \*\*Key Considerations:\*\* Robust error handling. Efficient history fetching. Securely saving messages.

\#\#\#\# \*\*Task 1.5: Implement the RAG Pipeline for Profile Data\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand RAG goal for context retrieval, Ask about embedding model choice (e.g., OpenAI \`text-embedding-3-small\`?), Ask about \`match\_count\` default (e.g., 3?), Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/rag.ts\`  
\* \*\*Goal:\*\* Make profile data intelligently searchable for context retrieval.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Set up Supabase \`pgvector\` extension and a \`profile\_embeddings\` table (\`userId\`, \`content\`, \`embedding vector\`).  
    2\.  Implement \`updateProfileEmbeddings(profile: BusinessProfile)\`: Triggered on profile update. Concatenate key profile text fields into a single string. Call embedding API. Save/update vector in DB.  
    3\.  Implement \`queryProfile(userId: string, queryText: string, match\_count: number): Promise\<string\[\]\>\`: Embed \`queryText\`. Perform cosine similarity search against user's vectors in DB. Return the \`content\` of the top \`match\_count\` results.

\#\#\#\# \*\*Task 1.6: Implement the Suggestion Engine & "Aha\!" Moment UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand proactive suggestion goal, Ask about phrasing for the "Aha\!" moment suggestion (make it exciting\!), Ask about frequency/logic for other suggestions, Await Approval)  
\* \*\*Context (Backend):\*\* \`libs/chat-core/src/suggestion\_engine.ts\`  
\* \*\*Context (Frontend):\*\* \`apps/dashboard/components/SuggestedPrompts.tsx\`  
\* \*\*Goal:\*\* Proactively guide the user and deliver instant value.  
\* \*\*Detailed Implementation Steps (Backend):\*\*  
    1\.  Implement \`getSuggestedPrompts(profile: BusinessProfile, website?: Website)\`:  
        \* \*\*"Aha\!" Moment:\*\* If profile was just completed (check creation/update timestamp), \*\*must\*\* return a suggestion for an immediate value action (e.g., "Generate 3 social media post ideas now using your new profile\!").  
        \* \*\*Gap Analysis:\*\* Analyze profile/website for missing core info (hours, services) or unused features (no website yet, no blog posts).  
        \* \*\*Goal Framing:\*\* Frame suggestions based on user goals (e.g., "Establish your online presence" instead of "Create website").  
        \* Return an array of suggestion strings.  
\* \*\*Detailed Implementation Steps (Frontend):\*\*  
    1\.  Create \`SuggestedPrompts\` React component.  
    2\.  Fetch suggestions via API endpoint calling \`getSuggestedPrompts\`.  
    3\.  Render suggestions as clean, clickable buttons below chat input. Clicking a button sends the text as a user message.

\#\#\#\# \*\*Task 1.7: Implement Chat History UI (NEW TASK)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand UI for displaying past chats, Ask about search/filtering needs for history, Ask about lazy loading/pagination, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ChatInterface.tsx\`  
\* \*\*Goal:\*\* Allow the user to view their past conversations with the AI.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Modify the main chat UI component.  
    2\.  Implement logic to fetch \`ChatMessage\` records for the current user, ordered by timestamp.  
    3\.  Display the fetched messages in the chat window, clearly distinguishing between 'user' and 'assistant' roles.  
    4\.  Implement pagination or infinite scrolling ("lazy loading") to handle potentially long chat histories efficiently.  
    5\.  (Optional V2) Add a search bar to filter chat history by keywords.  
\* \*\*Key Considerations:\*\* Performance for loading history is important. Clear visual design.

\#\#\#\# \*\*Task 1.8: Implement AI Opportunity Review UI Integration (Placeholder)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand this connects to Admin module's SEO Opps, Ask if any initial setup/placeholder needed in main UI for future display, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/\` (Likely modifies Chat Orchestrator or Suggestion Engine)  
\* \*\*Goal:\*\* Provide the mechanism for surfacing admin-approved SEO opportunities to the user.  
\* \*\*Detailed Implementation Steps:\*\* Modify the \`getSuggestedPrompts\` function (Task 1.6). Add logic to query the \`seo\_opportunities\` table (from Module 4\) for any opportunities with \`status: 'approved'\`. If found, format them as conversational suggestions (e.g., "I learned about a new SEO technique called '\[Name\]' that could help\! \[Description\]. Would you like me to try implementing it?").  
\* \*\*Key Considerations:\*\* This task depends on Module 4 and Module 10 being implemented.

\---

\#\# Module 2 Master Specification V7: AI Integrated Business Hub

This document is the definitive technical specification and implementation guide for the \*\*AI Integrated Business Hub\*\* module. This version covers the entire journey from idea to a live, multi-page, SEO-optimized, commercially integrated website with support for third-party embeds.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* From Conversation to Customers; No technical skills needed; Instant updates via "Living Website" dashboard.  
\* \*\*AI Persona & Logic:\*\* AI acts as web developer, SEO expert, copywriter, and visual designer.  
\* \*\*Code & Architecture:\*\* Multi-page architecture; Header/Footer consistency; Deep SEO integration; Action Queue for updates; Secure embed handling.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 2.1: Define Core Website Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand multi-page structure with Header/Footer/Embeds, Ask about initial navigation links, Ask about primary CTA options, Await Approval)  
\* \*\*Context:\*\* \`libs/website-builder/src/types.ts\`  
\* \*\*Goal:\*\* Define interfaces for \`Website\`, \`WebsiteHeader\`, \`WebsiteFooter\`, \`WebsitePage\`, \`WebsiteSection\` (including \`EmbedSection\`), \`WebsiteTheme\`, \`WebsiteSettings\`.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Define \`WebsiteHeader\`: \`{ logoUrl: string | null; navigationLinks: { text: string; slug: string; }\[\]; }\`  
    2\.  Define \`WebsiteFooter\`: \`{ contactInfo: string; socialLinks: { platform: string; url: string; }\[\]; copyrightText?: string; }\`  
    3\.  Define \`WebsiteSection\` union type including: \`HeroSection\` (headline, subheadline, ctaButton, backgroundImageUrl/VideoUrl), \`FeatureSection\` (items with icon, title, description), \`TextSection\` (rich text content), \`ImageGallerySection\` (array of image URLs \+ alt text), \`ContactFormSection\` (standard fields), \`EmbedSection\` (htmlContent: string). Ensure relevant sections have image/video URLs and alt text fields.  
    4\.  Define \`WebsitePage\`: \`{ title: string; slug: string; sections: WebsiteSection\[\]; metaTitle: string; metaDescription: string; structuredData: Record\<string, any\> | null; }\`  
    5\.  Define \`Website\`: \`{ userId: string; header: WebsiteHeader; pages: WebsitePage\[\]; footer: WebsiteFooter; theme: { colorPalette: string\[\]; font: string }; primaryCta: { text: string; phoneNumber: string; } | null; settings: { domainName?: string; isPublished?: boolean; } }\`  
\* \*\*Key Considerations:\*\* Main \`websites\` table uses \`jsonb\`.

\#\#\#\# \*\*Task 2.2: Implement the Multi-Page Website Generation Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand full site generation goal, Ask about default page count/types (Home, About, Services, Contact?), Ask about structured data specifics, Await Approval)  
\* \*\*Context:\*\* \`libs/website-builder/src/generator.ts\`  
\* \*\*Goal:\*\* Create function to generate a complete starter website.  
\* \*\*Detailed Implementation Steps:\*\* Implement \`generateInitialWebsite(profile)\`. Construct complex AI prompt. Call AI. Save resulting \`Website\` object to DB.  
\* \*\*AI Prompt Guidance:\*\* Instruct AI as "full-stack agency". Require JSON output matching \`Website\`. Generate content, SEO tags, structured data for 4 pages (Home, About, Services, Contact). Generate Header (with nav links) & Footer (with contact info). Generate alt text. Choose theme colors/font based on industry. Suggest stock images/videos.

\#\#\#\# \*\*Task 2.3: Implement Intelligent Image & Video Handling\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand 3-pronged approach (Auto, Chat, Upload), Ask about preferred stock media API (Pexels/Unsplash?), Ask about image optimization/resizing needs, Await Approval)  
\* \*\*Context:\*\* \`libs/website-builder/src/media\_handler.ts\`  
\* \*\*Goal:\*\* Automatically and conversationally manage website visuals.  
\* \*\*Detailed Implementation Steps:\*\* Implement automated stock media selection via API based on content keywords \+ profile industry. Implement chat intent handling for changing images/videos (Orchestrator dispatches command, this module handles update). Implement secure file upload to Supabase Storage for user uploads.

\#\#\#\# \*\*Task 2.4: Create the "Living Website" Dashboard\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand "Click-to-Edit" UI goal, Ask about visual preview mechanism (iframe?), Ask about granularity of editable sections, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/WebsiteDashboard.tsx\`  
\* \*\*Goal:\*\* Build the central UI for managing the website content visually.  
\* \*\*Detailed Implementation Steps:\*\* Create React component. Use an \`iframe\` for live preview or render components directly. Implement overlay edit buttons on sections/text/images. Clicking opens simple modals for changes. Modal save updates local state. Include "Save Changes" (updates DB) and "Save & Go Live" (updates DB \+ triggers publish) buttons.

\#\#\#\# \*\*Task 2.5: Implement End-to-End Publishing\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand domain \+ hosting goal, Ask about preferred domain registrar API (e.g., Namecheap?), Ask about hosting deployment strategy (Vercel API?), Await Approval)  
\* \*\*Context:\*\* \`libs/website-deploy/src/index.ts\`  
\* \*\*Goal:\*\* Handle the entire process of taking a website live on a custom domain.  
\* \*\*Detailed Implementation Steps:\*\* Implement functions \`suggestDomains\`, \`checkDomainAvailability\`, \`registerDomain\` via registrar API. Implement \`publishWebsite\` function: This likely involves generating static site files (HTML/CSS/JS) from the \`Website\` object, uploading them to a hosting provider (like Vercel Blob or Netlify), and configuring DNS records (via registrar API) to point the custom domain to the host. Update \`Website.settings.isPublished\`.  
\* \*\*Key Considerations:\*\* This is complex. Needs robust error handling and clear user feedback. DNS propagation takes time.

\#\#\#\# \*\*Task 2.6: Implement Google Business Profile Sync\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand GBP sync goal, Ask about specific fields to prioritize syncing (NAP, Hours, Services?), Ask about handling connection errors, Await Approval)  
\* \*\*Context:\*\* \`libs/google-integration/src/business\_profile.ts\`  
\* \*\*Goal:\*\* Ensure consistency between website and Google Maps presence.  
\* \*\*Detailed Implementation Steps:\*\* Implement secure OAuth via Connections Hub. Create \`syncGoogleBusinessProfile\` using Google API to update GBP based on Navi AI profile (NAP, Hours, Services). Trigger sync automatically after relevant profile changes, potentially via Action Queue command from Module 1\.

\#\#\#\# \*\*Task 2.7: Implement Automated Sitemap Generation\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand sitemap goal for SEO, Ask about including image sitemaps, Ask about ping frequency, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-tools/src/sitemap.ts\`  
\* \*\*Goal:\*\* Automatically keep search engines informed of all website content.  
\* \*\*Detailed Implementation Steps:\*\* Create \`generateSitemap\` function generating valid \`sitemap.xml\` listing all page slugs from \`Website.pages\`. Create \`pingSearchEngines\` (simple HTTP POST to Google/Bing endpoints). Run \`generateSitemap\` and \`pingSearchEngines\` automatically as part of the \`publishWebsite\` process.

\#\#\#\# \*\*Task 2.8: Implement Conversational Page Management\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand chat-based page management goal, Ask about handling duplicate page names, Ask about default content for new pages, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/orchestrator\_intents.ts\` & \`libs/website-builder/src/page\_manager.ts\`  
\* \*\*Goal:\*\* Allow user to manage website pages via natural language.  
\* \*\*Detailed Implementation Steps:\*\* Extend Chat Orchestrator with \`CREATE\_PAGE\`, \`DELETE\_PAGE\`, \`UPDATE\_PAGE\_CONTENT\` intents. Implement backend logic in \`page\_manager.ts\`: \`createPage(title, profile)\` uses AI to generate sections/SEO for new page, updates \`Website.pages\` array, adds link to \`Website.header.navigationLinks\`. \`deletePage(slug)\` removes page and nav link. \`updatePageContent(slug, sectionIndex, newContent)\` updates specific content. All functions must update the \`Website\` object in the DB and trigger \`publishWebsite\`.

\#\#\#\# \*\*Task 2.9: Implement the AI Content Strategist Integration\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand proactive content suggestion goal (from Module 4), Ask about trigger for suggesting content, Ask about handling user rejection, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/suggestion\_engine.ts\` & \`libs/website-builder/src/page\_manager.ts\`  
\* \*\*Goal:\*\* Integrate with proactive suggestions for SEO-valuable content.  
\* \*\*Detailed Implementation Steps:\*\* Suggestion engine identifies content gaps (e.g., missing FAQ, based on Module 4 insights). Orchestrator presents suggestion. If user agrees, trigger \`createPage\` logic from Task 2.8, providing specific instructions to AI for generating content with appropriate \`schema.org\` markup.

\#\#\#\# \*\*Task 2.10: Implement Automated Legal Page Generation\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand legal page generation goal, Ask about source for templates (AI-generated or pre-written?), Ask about necessary disclaimers, Await Approval)  
\* \*\*Context:\*\* \`libs/chat-core/src/suggestion\_engine.ts\` & \`libs/website-builder/src/page\_manager.ts\`  
\* \*\*Goal:\*\* Generate standard legal pages (Privacy Policy, ToS) to enhance trust.  
\* \*\*Detailed Implementation Steps:\*\* Suggestion engine checks for missing legal pages. Orchestrator offers to generate them. If user agrees, use AI or pre-defined templates populated with user's business details (Name, Address) to create content. Call \`createPage\` to add the pages. Add links to \`Website.footer\`. Trigger \`publishWebsite\`.

\#\#\#\# \*\*Task 2.11: Implement Simplified Analytics Integration\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand analytics display goal, Ask about preferred provider (Plausible/Simple/GA?), Ask about key metrics for V1 (Visitors, Top Pages, Referrers?), Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/WebsiteAnalyticsWidget.tsx\` & \`libs/website-deploy/src/index.ts\`  
\* \*\*Goal:\*\* Provide simple, clear visibility into website traffic.  
\* \*\*Detailed Implementation Steps:\*\* During \`publishWebsite\`, inject the chosen analytics provider's tracking script into the generated HTML. Create a \`WebsiteAnalyticsWidget\` component in the dashboard. This widget either embeds a shared dashboard from the provider or uses the provider's API to fetch and display key metrics (Visitors, Page Views, Top Pages, Top Referrers) in simple charts/lists. Enable chat assistant (Module 1\) to answer basic traffic questions by querying this data.

\#\#\#\# \*\*Task 2.12: Implement Integrated Lead Capture Logging\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand lead capture connection to Module 7, Ask about confirmation message ("Thank You" page?), Await Approval)  
\* \*\*Context:\*\* Website contact form component & \`libs/contact-hub/src/lead\_ingestion.ts\`  
\* \*\*Goal:\*\* Ensure website form submissions are automatically saved to the Contact Hub.  
\* \*\*Detailed Implementation Steps:\*\* Modify the website contact form's submit handler. On submit, call the \`ingestNewLead\` function from Module 7, passing the form data (name, email, phone, message). Display a success message or redirect to a "Thank You" page on the website.

\#\#\#\# \*\*Task 2.13: Implement Primary Call-to-Action (Click-to-Call)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand prominent Call button goal, Ask about placement (Header? Sticky footer on mobile?), Ask about fallback if no phone number provided, Await Approval)  
\* \*\*Context:\*\* \`libs/website-builder/src/types.ts\` and website rendering logic.  
\* \*\*Goal:\*\* Drive immediate phone calls from the website.  
\* \*\*Detailed Implementation Steps:\*\* Ensure \`primaryCta\` exists in \`Website\` type. Ask user for business phone during onboarding (Module 1). Store in profile. Website generation pulls this into \`Website.primaryCta\`. Render a highly visible "Call Now" button in header/sticky footer using \`tel:\[phoneNumber\]\`.

\#\#\#\# \*\*Task 2.14: Implement "Embed Anything" Integration\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand third-party embed goal, Ask about security (sandboxing mandatory?), Ask about UI for adding embeds (via chat?), Await Approval)  
\* \*\*Context:\*\* \`libs/website-builder/src/types.ts\` and \`libs/chat-core/src/orchestrator\_intents.ts\`  
\* \*\*Goal:\*\* Allow users to integrate existing niche software via HTML embed codes.  
\* \*\*Detailed Implementation Steps:\*\* Add \`EmbedSection\` to \`WebsiteSection\` union type, with \`htmlContent: string\`. User tells chat they want to add an embed for \[Purpose\]. AI asks for the HTML embed code. Code is saved to an \`EmbedSection\` within a chosen \`WebsitePage\`. Website rendering \*\*must\*\* place this \`htmlContent\` inside a sandboxed \`\<iframe\>\` (using the \`sandbox\` attribute) to prevent security risks.

\---

\#\# Module 3 Master Specification V4: AI Content Autopilot

This document is the definitive technical specification and implementation guide for the \*\*AI Content Autopilot\*\* module. This version integrates a complete content marketing strategy, including visual branding, intelligent content repurposing, and business-focused calls-to-action.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Set It and Forget It; Frictionless Approval (email/SMS); Full Transparency via dashboard.  
\* \*\*AI Persona & Logic:\*\* Expert Digital Marketer Persona (writes, optimizes, designs visuals, repurposes).  
\* \*\*Code & Architecture:\*\* Scheduler-First Architecture; Secure Approval Tokens; Robust Inbound Webhooks; Content as Data.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 3.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand enhanced \`BlogPost\` & \`ContentSettings\`, Ask about V1 \`repurposedAssets\` priorities, Ask about predefined vs custom \`primaryBusinessGoalCta\`, Await Approval)  
\* \*\*Context:\*\* \`libs/content-engine/src/types.ts\`  
\* \*\*Goal:\*\* Enhance data structures for a full-funnel content strategy.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Enhance \`BlogPost\` Interface: Add \`focusKeyword: string | null\`, \`brandedGraphicUrl: string | null\`, \`repurposedAssets: { platform: string; content: string; imageUrl?: string; }\[\] | null\`. Also include statuses like \`scheduled\`, \`pending\_approval\`, etc. and \`approvalToken\`.  
    2\.  Enhance \`ContentSettings\` Interface: Add \`primaryBusinessGoalCta: string | null\`, \`frequency\`, \`targetPlatforms\`, \`isEnabled\`.  
\* \*\*Key Considerations:\*\* Update \`blog\_posts\`, new \`content\_settings\` tables.

\#\#\#\# \*\*Task 3.2: Implement the AI Topic & Keyword Suggestion Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand topic \+ keyword suggestion goal, Ask about keyword analysis depth, Ask about SEO-focused topic formats, Await Approval)  
\* \*\*Context:\*\* \`libs/content-engine/src/topic\_suggester.ts\`  
\* \*\*Goal:\*\* Proactively provide SEO-viable blog post ideas.  
\* \*\*Detailed Implementation Steps:\*\* Modify function to \`getTopicAndKeywordSuggestions(profile)\`. Return \`Promise\<{ topic: string; keyword: string; }\[\]\>\`.  
\* \*\*AI Prompt Guidance:\*\* Instruct AI as "Expert SEO/Content Strategist". Provide profile context. Require topic \+ keyword research output.

\#\#\#\# \*\*Task 3.3: Implement the Full Draft & Visual Generation Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand draft \+ visual generation goal, Ask about image API inputs (title, colors, icon?), Ask about CTA integration (boilerplate vs natural?), Await Approval)  
\* \*\*Context:\*\* \`libs/content-engine/src/draft\_generator.ts\`  
\* \*\*Goal:\*\* Create a complete, SEO-optimized, visually branded, business-focused draft.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Modify function \`generateDraft(topic, keyword, profile, settings)\`.  
    2\.  Call AI for text (including keyword placement and incorporating \`primaryBusinessGoalCta\`) \+ visual concept.  
    3\.  Call Image Generation API (e.g., via abstracted service) based on concept.  
    4\.  Save \`title\`, \`contentMarkdown\`, \`seoMetadata\`, \`focusKeyword\`, \`brandedGraphicUrl\` to DB as a \`BlogPost\` with status \`scheduled\`.  
\* \*\*AI Prompt Guidance:\*\* Instruct AI as "SEO Copywriter/Graphic Designer". Provide keyword. Require strategic keyword placement. Require inclusion of \`primaryBusinessGoalCta\`. Require visual concept output (colors, icon, text overlay).

\#\#\#\# \*\*Task 3.4: Implement the Content Repurposing & Publishing Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand repurposing \+ publishing workflow, Ask about number of initial assets, Ask if repurposing happens with draft generation, Await Approval)  
\* \*\*Context:\*\* \`libs/content-engine/src/publisher.ts\` & \`libs/content-engine/src/repurposer.ts\`  
\* \*\*Goal:\*\* Maximize content reach by atomizing it for different platforms.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  \*\*Content Repurposing:\*\* Create \`repurposeContent(post: BlogPost, profile: BusinessProfile)\` function. Call this \*after\* draft generation (Task 3.3). Use AI to generate asset package (LinkedIn summary, Facebook question, tips etc.). Save results to \`BlogPost.repurposedAssets\` field.  
    2\.  \*\*Scheduling & Approval Trigger:\*\* Create \`runContentScheduler()\` job (runs based on \`ContentSettings.frequency\`). Finds users due for a post. Calls \`getTopicAndKeywordSuggestions\`, then \`generateDraft\`, then \`repurposeContent\`. Saves post with status \`pending\_approval\`. Triggers approval notification (Task 3.5).  
    3\.  \*\*Publisher Job:\*\* Create \`runContentPublisher()\` job (runs frequently). Finds posts with status \`approved\` and \`scheduledAt\` is past. Calls \`publishToWebsite(post)\` and \`publishToSocial(post, asset)\` for each target platform/asset. Updates post status to \`published\`.  
    4\.  Implement \`publishToWebsite(post)\`: Calls Website Builder module (likely via Action Queue) to create new blog page and republish site.  
    5\.  Implement \`publishToSocial(post, asset)\`: Calls Social Media Hub module (via Action Queue) to schedule/publish the specific repurposed asset.  
\* \*\*AI Prompt Guidance:\*\* (For repurposing) Instruct AI as "Social Media Marketing Expert". Provide full blog content. Require package of platform-specific assets.  
\* \*\*Key Considerations:\*\* Robust scheduling logic. Clear separation between generation, approval, and publishing.

\#\#\#\# \*\*Task 3.5: Implement Email/SMS Approval Workflow\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand outbound email/SMS \+ inbound handling, Ask about notification content (include all assets?), Ask about reply parsing logic, Await Approval)  
\* \*\*Context:\*\* \`libs/communication-hub/\` integration, API endpoints, Webhook handlers.  
\* \*\*Goal:\*\* Create frictionless email/SMS approval loop.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  \*\*Send Approval:\*\* After draft+assets generated, call Communication Hub to send email/SMS. Include secure Approve/Request Changes links/instructions (using \`approvalToken\`). Show previews of all assets. Set status to \`pending\_approval\`.  
    2\.  \*\*Handle Approval:\*\* Implement endpoint/webhook handler. Validate token/reply ("YES"). Update status to \`approved\`. Trigger \`runContentPublisher\` or wait for schedule. Send confirmation.  
    3\.  \*\*Handle Edit Request:\*\* Implement webhook handler for non-"YES" replies. Parse feedback. Update status to \`changes\_requested\`. Call AI function \`reviseDraftAndAssets(post, feedback)\`. Re-run step 1 (send new approval notification).  
\* \*\*AI Prompt Guidance:\*\* (For revision) Instruct AI to revise draft and relevant assets based on user feedback.

\#\#\#\# \*\*Task 3.6: Update the Content Dashboard UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand UI changes for strategy/repurposing/approval, Ask about CTA examples in settings, Ask about previewing repurposed assets, Ask about displaying approval status clearly, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ContentDashboard.tsx\`  
\* \*\*Goal:\*\* Provide clear view of strategy, assets, and approval status.  
\* \*\*Detailed Implementation Steps:\*\* Add \`ContentSettings\` UI (enable/disable, frequency, platforms, \`primaryBusinessGoalCta\`). Update post list to show status (\`scheduled\`, \`pending\_approval\`, \`published\`). Post detail view shows main draft \*and\* previews of all \`repurposedAssets\`. Include 'Resend Approval' button if pending.

\---

\#\# Module 4 Final Master Specification V2: AI SEO Growth Engine

This document is the definitive technical specification and implementation guide for the \*\*AI SEO Growth Engine\*\* module. This version expands the scope to include a comprehensive Local Presence & Citation Audit across multiple platforms like Apple Maps.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* From Data to Decisions; Celebrate Wins; Demystify SEO.  
\* \*\*AI Persona & Logic:\*\* Competitive SEO Strategist Persona; Local First (incl. citations).  
\* \*\*Code & Architecture:\*\* Third-Party Data Integration; Automated & Recurring; Action-Based Integration; Admin-Gated Knowledge Base.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 4.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand performance tracking structs, Ask about history data size, Ask about V1 limits, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/types.ts\`  
\* \*\*Goal:\*\* Define structures for health, performance, competition, actions, opportunities.  
\* \*\*Detailed Implementation Steps:\*\* (Define \`SeoIssue\`, \`SeoAuditReport\`, \`SeoFixLog\`, \`SeoActionCommand\`, \`SeoOpportunity\`. Define \`SeoSettings\`, \`KeywordPerformance\`).  
\* \*\*Key Considerations:\*\* Requires multiple new tables.

\#\#\#\# \*\*Task 4.2: Implement the Core Website Crawler & Analyzer\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand crawler goal, Ask about crawl depth, Ask about V1 on-page factors, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/crawler.ts\`  
\* \*\*Goal:\*\* Gather raw data for SEO health audit.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`runWebsiteAudit(websiteUrl)\`. Crawl main pages. Check Title, Meta Desc, H1, Alt Text. Check \`robots.txt\`, \`sitemap.xml\`. Return \`SeoIssue\[\]\`).  
\* \*\*Key Considerations:\*\* Handle crawl errors.

\#\#\#\# \*\*Task 4.3: Implement Local Presence & Citation Analysis (UPGRADED)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand expanded local audit goal (Google, Apple, Yelp), Ask about V1 platform priorities, Ask about checking existence vs consistency, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/local\_analyzer.ts\`  
\* \*\*Goal:\*\* Audit consistency across key local platforms.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`runLocalAudit(profile, website)\`. Check GBP consistency (NAP) & completeness. Search Yelp/Apple Maps. If found, scrape NAP & compare. If not found, flag as missing. Return \`SeoIssue\[\]\`).  
\* \*\*Key Considerations:\*\* Scraping is fragile; consider V2 API.

\#\#\#\# \*\*Task 4.4: Implement Keyword Rank Tracking\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand rank tracking goal via API, Ask about localization necessity, Ask about API failure handling, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/rank\_tracker.ts\`  
\* \*\*Goal:\*\* Provide daily, localized rank updates for user & competitors.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`runRankTracker()\` daily job. Loop users/keywords. Call localized SEO API. Parse ranks for user/competitors. Save \`KeywordPerformance\`).  
\* \*\*Key Considerations:\*\* API Abstraction, Error Handling, Cost Management.

\#\#\#\# \*\*Task 4.5: Implement the Audit & Tracking Scheduler\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand scheduler orchestration goal, Ask about cadence (weekly audit, daily ranks?), Ask about user notifications, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/scheduler.ts\`  
\* \*\*Goal:\*\* Automate all SEO analysis jobs.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`initializeSchedulers()\`. Define weekly \`runWeeklyHealthAudits()\` job (calls 4.2, 4.3, calculates score, saves report, notifies). Define daily job calling \`runRankTracker()\` (4.4)).  
\* \*\*Key Considerations:\*\* Job robustness, Timezones.

\#\#\#\# \*\*Task 4.6: Implement the AI Competitive Strategist\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand AI strategist goal, Ask about V1 insight priority (Content Gap?), Ask about UI presentation, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/strategist.ts\`  
\* \*\*Goal:\*\* Turn competitive data into actionable strategies.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`generateCompetitiveInsights(userId)\` weekly job. Fetch performance data, run content gap via API. Compile summary. Call AI. Save structured JSON insight/recommendation/celebration).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "SEO Strategist". Provide data summary. Require specific JSON output).  
\* \*\*Key Considerations:\*\* Structured JSON is critical.

\#\#\#\# \*\*Task 4.7: Create the SEO Growth Dashboard UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand unified dashboard UI, Ask about rank chart visualization, Ask about handling "Not Ranked", Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/SeoDashboard.tsx\`  
\* \*\*Goal:\*\* Create single dashboard for health, performance, competition.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`SeoDashboard\` component. Add Settings modal (keywords/competitors). Structure with "Site Health" tab (score gauge, prioritized issues, fix buttons) and "Performance & Competition" tab (Strategist card, rank charts, competitor table)).  
\* \*\*Key Considerations:\*\* Loading/Empty States, Responsiveness.

\#\#\#\# \*\*Task 4.8: Implement "Fix it for Me" AI Actions\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand action queue decoupling goal, Ask about first listener module (Website Builder?), Ask about UI feedback (in progress/failed?), Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/fixer.ts\`  
\* \*\*Goal:\*\* Decouple SEO module via centralized action queue.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`runAiFix(issue, website)\`. Use AI to generate fix. Create & save \`SeoActionCommand\` (e.g., \`UPDATE\_WEBSITE\_CONTENT\` with payload). Create \`SeoFixLog\` entry).  
\* \*\*Key Considerations:\*\* Robust event-driven architecture.

\#\#\#\# \*\*Task 4.9: Implement the AI Best Practices Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand admin-gated knowledge update, Ask about admin notification method, Ask about admin UI location, Await Approval)  
\* \*\*Context:\*\* \`libs/seo-audit/src/best\_practices.ts\`  
\* \*\*Goal:\*\* Keep SEO knowledge current while protecting users.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`updateSeoKnowledgeBase()\` monthly job. Use grounded AI to research trends. Save new techniques to \`seo\_opportunities\` table with \`status: 'pending\_review'\`. Notify admin. Chat Orchestrator only suggests \`approved\` opportunities).  
\* \*\*Key Considerations:\*\* Admin UI is required for review.

\#\#\#\# \*\*Task 4.10: Implement Monthly Performance Reporting\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand monthly email report goal, Ask about email subject line focus, Ask about cross-module teasers, Await Approval)  
\* \*\*Context:\*\* \`libs/reporting/src/seo\_reporter.ts\`  
\* \*\*Goal:\*\* Automatically email monthly summary of progress and value.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`generateAndSendMonthlyReports()\` monthly job. Query reports, logs, performance data. Calculate score change, fixes, rank change. Compile HTML email. Send via Communication Hub).  
\* \*\*Key Considerations:\*\* Email design, Unsubscribe link.

\---

\#\# Module 5 Master Specification V2: AI Social Media Growth Hub

This document is the definitive technical specification and implementation guide for the \*\*AI Social Media Growth Hub\*\* module. This version is a complete, two-way communication and business growth platform, incorporating outbound scheduling, inbound engagement, strategic analytics, \*\*and support for Instagram & Twitter/X\*\*.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Unified Command Center; Effortless Engagement & Creation; Visual First (incl. Grid Preview).  
\* \*\*AI Persona & Logic:\*\* Expert Social Media Strategist Persona (Community, Content, Strategy, Analytics).  
\* \*\*Code & Architecture:\*\* Shared Core Services (Connections, Scheduler); Data-Driven & Integrated (Website Analytics); \*\*Multi-Platform API Abstraction\*\*.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 5.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand engagement \+ idea structs, Ask about platform list extension (\`instagram\`, \`twitter\`), Ask about \`SocialConversation\` statuses, Ask about storing raw webhook payload, Await Approval)  
\* \*\*Context:\*\* \`libs/social-hub/src/types.ts\`  
\* \*\*Goal:\*\* Define structures including support for new platforms.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  \*\*Enhance Platform Types:\*\* Update \`platform\` enums/literals in \`SocialConnection\` and \`SocialConversation\` to include \`'instagram'\` and \`'twitter'\`.  
    2\.  Define \`SocialConnection\`, \`PostAnalytics\`, \`SocialPost\` (add \`websiteClicks\`). Define \`SocialMessage\`, \`SocialConversation\`. Define \`SocialIdea\` interfaces as detailed previously.  
\* \*\*Key Considerations:\*\* Ensure database enums/constraints are updated.

\#\#\#\# \*\*Task 5.2: Create the Social Growth Hub Dashboard UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand 4-tab UI, Ask about Inbox layout, Ask about Overview tab needs, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/SocialHubDashboard.tsx\`  
\* \*\*Goal:\*\* Create main UI for the social module.  
\* \*\*Detailed Implementation Steps:\*\* (Create parent component. Implement tabs: "Calendar", "Inbox", "Analytics", "Connections". Populate tabs with respective components).

\#\#\#\# \*\*Task 5.3: Implement the Outbound Workflow (Composer & Advanced Calendar)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand composer \+ calendar bundle, Ask about platform-specific composer previews (e.g., character count for Twitter), Ask about Grid Preview interaction, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/PostComposer.tsx\` and \`apps/dashboard/components/ContentCalendar.tsx\`  
\* \*\*Goal:\*\* Build tools for planning content, including Instagram grid planning.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  \*\*Build the \`PostComposer\`:\*\* Implement UI. Enhance "Adapt for..." AI features to include Instagram (focus on visuals, captions) and Twitter (conciseness, hashtags, handles). Add character counter.  
    2\.  \*\*Build the \`ContentCalendar\`:\*\* Implement standard view \+ \`InstagramGridPreview\` view.  
\* \*\*AI Prompt Guidance:\*\* (Update adaptation prompts for Instagram and Twitter specifics).

\#\#\#\# \*\*Task 5.4: Implement the AI Idea Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand proactive idea engine, Ask about idea generation frequency, Ask about UI for presenting ideas, Await Approval)  
\* \*\*Context:\*\* \`libs/social-hub/src/idea\_engine.ts\`  
\* \*\*Goal:\*\* Proactively provide timely, relevant, original social content ideas.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`generateSocialIdeas()\` weekly job. Call AI based on profile/date. Save \`SocialIdea\` records).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "Expert social strategist". Request timely ideas \+ image suggestion based on profile/date. Require JSON output).

\#\#\#\# \*\*Task 5.5: Implement the Publishing & Business Analytics Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand publishing \+ analytics jobs, Ask about failure notifications, Ask about engagement rate calculation, Ask about integrating new platform clients, Ask about UTM parameter structure, Await Approval)  
\* \*\*Context:\*\* \`libs/social-hub/src/publisher.ts\`, \`libs/social-hub/src/analytics\_fetcher.ts\`, \*\*and new \`libs/social-clients/\`\*\*  
\* \*\*Goal:\*\* Create backend engines for publishing and analytics across all supported platforms.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  \*\*API Client Abstraction:\*\* Create specific client implementations for Instagram (Graph API) and Twitter/X (v2 API) within the \`libs/social-clients/\` directory.  
    2\.  \*\*Enhance \`runPublishingJob()\`:\*\* Modify to call the correct client. Add UTM tags.  
    3\.  \*\*Enhance \`runAnalyticsFetcher()\`:\*\* Add logic to call Instagram/Twitter APIs for engagement. Query website analytics for UTM-tagged visits/conversions. Update \`PostAnalytics\`.

\#\#\#\# \*\*Task 5.6: Implement the Inbound Message Engine\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand inbound engine goal, Ask about webhook setup complexity for Instagram/Twitter, Ask about polling fallback necessity, Ask about handling DMs vs comments, Await Approval)  
\* \*\*Context:\*\* \`libs/social-hub/src/inbox\_fetcher.ts\`  
\* \*\*Goal:\*\* Create backend engine to populate the Unified Inbox from all platforms.  
\* \*\*Detailed Implementation Steps:\*\*  
    1\.  Enhance \`processInboundWebhook()\` to handle Instagram/Twitter payloads.  
    2\.  Enhance \`runInboxPoller()\` to include API calls for Instagram/Twitter.  
    3\.  Ensure correct parsing and creation of \`SocialConversation\` / \`SocialMessage\`.

\#\#\#\# \*\*Task 5.7: Implement the Unified Inbox & AI Reply Assistant UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand inbox UI \+ AI reply feature, Ask about AI suggestion interaction (pre-fill vs button?), Ask about quick actions (Like button?), Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/UnifiedInbox.tsx\`  
\* \*\*Goal:\*\* Build UI for viewing and responding to customer conversations.  
\* \*\*Detailed Implementation Steps:\*\* (Build \`UnifiedInbox\` component (2-column layout). Include reply box \+ "Suggest Reply" button. Button calls backend \`getReplySuggestion()\`. Display suggestion for user approval/edit before sending).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "Community Manager". Provide profile context \+ message. Require concise, on-brand reply).

\---

\#\# Module 6 Master Specification V2: AI Communication & Automation Hub

This document is the definitive technical specification and implementation guide for the \*\*AI Communication & Automation Hub\*\* module. This version integrates AI-assisted A/B testing and mandatory Calls-to-Action to create a more effective, business-focused communication tool.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Simplicity Above All; Goal-Oriented; Seamless Integration with Contacts.  
\* \*\*AI Persona & Logic:\*\* Expert Direct Response Marketer Persona (writes persuasive copy, suggests subject lines).  
\* \*\*Code & Architecture:\*\* CRM-First (Contacts from Module 7); Provider Agnostic (Email/SMS); Reliable Automation Engine.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 6.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand Broadcast A/B test changes, Ask about test size default, Ask about single vs multiple CTAs in settings, Await Approval)  
\* \*\*Context:\*\* \`libs/communication-hub/src/types.ts\`  
\* \*\*Goal:\*\* Enhance data structures for A/B testing and goal-oriented CTAs.  
\* \*\*Detailed Implementation Steps:\*\* (Define \`Contact\`, \`Audience\` from V1. Create \`CommunicationSettings\` (with \`primaryCta\`). Enhance \`Broadcast\` (add \`testing\` status, array for content versions, \`abTestConfig\` object). Define \`AutomationSequence\` interfaces from V1).  
\* \*\*Key Considerations:\*\* New \`communication\_settings\` table, update \`broadcasts\` table.

\#\#\#\# \*\*Task 6.2: Implement the Centralized Contact Hub Integration\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand this module READS contacts from Module 7, Ask about required contact fields, Ask about tag filtering logic, Await Approval)  
\* \*\*Context:\*\* \`libs/communication-hub/src/contact\_adapter.ts\`  
\* \*\*Goal:\*\* Ensure this module correctly accesses and filters contacts managed by Module 7\.  
\* \*\*Detailed Implementation Steps:\*\* (Create functions to fetch contacts from Module 7's database table, allowing filtering by tags for audience selection).  
\* \*\*Key Considerations:\*\* This module does NOT manage contacts directly; it's read-only access.

\#\#\#\# \*\*Task 6.3: Implement the AI-Powered Composer\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand AI composer with A/B subjects \+ CTA, Ask about UI for selecting A/B subjects, Ask about CTA editability, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/CommunicationComposer.tsx\`  
\* \*\*Goal:\*\* Make writing and optimizing marketing copy effortless.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`CommunicationComposer\`. User provides prompt. Call AI. UI presents 3 subject line options (checkboxes). AI-generated body with integrated CTA populates editor).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "Direct Response Marketer". Require body text including \`primaryCta\`. Require 3 distinct subject line options in JSON array \`subjectLines\`).

\#\#\#\# \*\*Task 6.4: Implement One-Time Broadcasts\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand broadcast wizard with A/B step, Ask about UI for 'testing' phase, Ask about option to skip A/B test, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/flows/CreateBroadcastFlow.tsx\`  
\* \*\*Goal:\*\* Create easy workflow for sending optimized newsletters.  
\* \*\*Detailed Implementation Steps:\*\* (Create wizard UI: Step 1: Audience (fetch from 6.2). Step 2: Content (embed 6.3, user selects 2 subjects). Step 3: Schedule & Confirm (incl. "Find Best Subject & Send" button). Save \`Broadcast\` with \`abTestConfig\`).

\#\#\#\# \*\*Task 6.5: Implement the Automation Sequence Builder\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simple automation builder, Ask about V1 trigger priority ('New Lead Added'?), Ask about UI (vertical list?), Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/AutomationBuilder.tsx\`  
\* \*\*Goal:\*\* Allow users to create simple, time-based follow-up sequences.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`AutomationBuilder\` component. User chooses trigger. UI shows list of steps (Send Email/SMS, Wait). Adding send step opens composer (6.3). Adding wait step prompts for days. Save \`AutomationSequence\` object).

\#\#\#\# \*\*Task 6.6: Implement the Communication & Automation Engine (Backend)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand broadcast scheduler \+ A/B logic \+ automation engine, Ask about state management for A/B tests, Ask about unsubscribe handling in sequences, Await Approval)  
\* \*\*Context:\*\* \`libs/communication-hub/src/engine.ts\`  
\* \*\*Goal:\*\* Create reliable backend jobs to send communications with optimization.  
\* \*\*Detailed Implementation Steps:\*\* (Modify Broadcast Scheduler: Handle \`abTestConfig\`, send test batches, schedule winner check job. Create A/B Test Winner Job: Query stats via provider API, determine winner, update config, queue final send. Implement Automation Engine: Scheduled job finds contacts due for next step, executes step (send/wait), updates progress, checks unsubscribe status).

\#\#\#\# \*\*Task 6.7: Implement Performance Analytics\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand analytics UI goal, Ask about V1 metric priority (Open/Click Rate?), Ask about visualizing sequence funnel, Ask about showing A/B test results, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/CommunicationAnalytics.tsx\`  
\* \*\*Goal:\*\* Provide clear insights into campaign and A/B test performance.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`CommunicationAnalytics\` component. For Broadcasts: Display sent, open rate, click rate. Display A/B test result card if applicable. For Sequences: Display simple funnel showing contacts at each step).  
\* \*\*Key Considerations:\*\* Data fetched via webhooks from email/SMS provider needs to be stored/aggregated efficiently.

\---

\#\# Module 7 Master Specification V2: AI Lead & Contact Hub

This document is the definitive technical specification and implementation guide for the \*\*AI Lead & Contact Hub\*\* module. This version focuses on providing a simple, streamlined system for capturing leads and managing contacts, tailored for SMBs who do not require complex sales pipeline features. It also ensures engagement data from communications is visible \*\*and integrates billing status tagging\*\*.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Simplicity is Key; Zero Data Entry; Action-Oriented (Simplified); \*\*Clear view of customer status\*\*.  
\* \*\*AI Persona & Logic:\*\* Helpful Organizer Persona (Summarizes interactions).  
\* \*\*Code & Architecture:\*\* Single Source of Truth for Contacts; Omnichannel Ingestion; Activity Timeline (incl. Engagement & Billing Status).

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 7.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simplified structs (\`Contact\`, \`ActivityEvent\`), Ask about new engagement event types, Ask about \`Contact\` status vs tags (use tags), Ask about billing tags, Await Approval)  
\* \*\*Context:\*\* \`libs/contact-hub/src/types.ts\`  
\* \*\*Goal:\*\* Define streamlined structures for contacts and interactions, including engagement and billing status via tags.  
\* \*\*Detailed Implementation Steps:\*\* (Define \`Contact\` interface (name, email, phone, tags, createdAt). \*\*Tags will include billing statuses\*\* e.g., \`'active\_customer', 'trial\_user', 'canceled\_customer'\`. Define \`ActivityEvent\` interface (add types: \`email\_opened\`, \`link\_clicked\`, \`'billing\_status\_change'\`)).  
\* \*\*Key Considerations:\*\* Requires \`contacts\`, \`activity\_events\` tables.

\#\#\#\# \*\*Task 7.2: Implement the Contact List Dashboard\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simple table UI goal, Ask about including 'Billing Status' tag as a filterable column, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ContactsDashboard.tsx\`  
\* \*\*Goal:\*\* Create simple interface, allowing filtering by billing status.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`ContactsDashboard\` component (searchable/sortable table). Include columns Name, Email, Phone, Tags (display prominently), Date Added. Implement tag management. Add manual contact button. Implement filtering by tags).

\#\#\#\# \*\*Task 7.3: Implement the Unified Contact View\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simplified detail view with engagement, Ask about using icons in timeline, Ask about key action buttons, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ContactDetailView.tsx\`  
\* \*\*Goal:\*\* Provide focused view of contact info and complete interaction history.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`ContactDetailView\`. Display Contact info. Display chronological \`ActivityEvent\` list (incl. lead capture, notes, sends, opens, clicks, \*\*billing changes\*\*). Include "Add Note" input. Include "Send Email/SMS" buttons integrating with Comm Hub).  
\* \*\*Key Considerations:\*\* Comm Hub & \*\*Billing Hub\*\* MUST log relevant events (\`email\`, \`sms\`, \`opened\`, \`clicked\`, \`billing\_status\_change\`) back to this module's \`activity\_events\` table and update tags on \`Contact\`.

\#\#\#\# \*\*Task 7.4: Implement Omnichannel Lead Ingestion\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simplified lead ingestion, Ask about de-dupe logic, Ask about default tag (\`new\_lead\`?), Await Approval)  
\* \*\*Context:\*\* \`libs/contact-hub/src/lead\_ingestion.ts\`  
\* \*\*Goal:\*\* Automate capture and organization of new leads.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`ingestNewLead(source, data)\`. Search contacts by email. If none, create \`Contact\` \+ add tag. Create \`ActivityEvent\` type \`lead\_capture\`. Integrate with Website form & Social Hub).  
\* \*\*Key Considerations:\*\* Robust email de-duplication.

\#\#\#\# \*\*Task 7.5: Implement AI Interaction Summary\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand simple AI summary goal, Ask about history length, Ask about highlighting engagement/billing status in summary, Await Approval)  
\* \*\*Context:\*\* \`libs/contact-hub/src/ai\_summary.ts\`  
\* \*\*Goal:\*\* Provide quick AI overview of contact history.  
\* \*\*Detailed Implementation Steps:\*\* (Add "AI Summarize Activity" button to \`ContactDetailView\`. Fetch recent \`ActivityEvent\`s. Pass to AI. Display summary).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "Helpful Assistant". Provide timeline. Require concise summary highlighting key interactions, recent engagement, and current billing status tag).

\---

\#\# Module 8 Master Specification V4: AI Reputation Management Hub

This document is the definitive technical specification and implementation guide for the \*\*AI Reputation Management Hub\*\* module. This version integrates the email/SMS approval workflow, showcases positive reviews, enhances negative review handling, \*\*and adds support for Facebook Reviews\*\*.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Unified & Actionable Inbox; Frictionless Approval; Proactive Growth & Marketing.  
\* \*\*AI Persona & Logic:\*\* Expert Reputation Manager Persona.  
\* \*\*Code & Architecture:\*\* Leverage Connections Hub; Leverage Communication Hub; Leverage Action Queue; \*\*Multi-Platform Review Fetching\*\*.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 8.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand enhanced \`Review\` struct, Ask about adding 'facebook' to \`ReviewSource\` platform type, Ask about statuses, Await Approval)  
\* \*\*Context:\*\* \`libs/reputation-hub/src/types.ts\`  
\* \*\*Goal:\*\* Enhance data structures for approval, showcasing, and Facebook reviews.  
\* \*\*Detailed Implementation Steps:\*\* (Enhance \`ReviewSource\`: add \`'facebook'\`. Define \`ReviewResponse\`, \`ReputationSettings\`. Enhance \`Review\`: add detailed statuses, \`suggestedResponseContent\`, \`approvalToken\`, \`isGoodForShowcasing\`).  
\* \*\*Key Considerations:\*\* Update \`review\_sources\`, \`reviews\` tables.

\#\#\#\# \*\*Task 8.2: Implement Connection Management UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand connection UI goal, Ask about handling Facebook Page selection after OAuth, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ReputationConnections.tsx\`  
\* \*\*Goal:\*\* Allow secure connection to Google, Yelp, \*\*and Facebook Pages\*\*.  
\* \*\*Detailed Implementation Steps:\*\* Utilize shared \`ConnectionsManager\`. Add logic for Facebook Page selection. Save connection to \`ReviewSource\`. Attempt auto-fetch of review links.

\#\#\#\# \*\*Task 8.3: Implement Automated Review Fetcher\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand review fetcher job, Ask about check frequency, Ask about Facebook Reviews API specifics, Await Approval)  
\* \*\*Context:\*\* \`libs/reputation-hub/src/review\_fetcher.ts\`  
\* \*\*Goal:\*\* Automatically pull in new reviews from Google, Yelp, \*\*and Facebook\*\*.  
\* \*\*Detailed Implementation Steps:\*\* Enhance \`runReviewFetcher()\` job. Add logic to call Facebook Graph API to fetch reviews for the connected page. De-duplicate and save new \`Review\` records.

\#\#\#\# \*\*Task 8.4: Create the Unified Review Inbox UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand inbox UI with statuses/showcase buttons, Ask about disabling reply box when pending, Ask about placement of showcase buttons, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ReviewInbox.tsx\`  
\* \*\*Goal:\*\* Provide clear interface reflecting status and enabling actions.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`ReviewInbox\`. Fetch/display reviews. Filters. Card shows status & action buttons. If \`isGoodForShowcasing\`, show 'Add to Website'/'Share on Social').

\#\#\#\# \*\*Task 8.5: Implement the AI Reply Assistant & Notification Sender\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand suggestion \+ notification workflow, Ask about pulling contact info from profile, Confirm notification methods, Await Approval)  
\* \*\*Context:\*\* \`libs/reputation-hub/src/reply\_assistant.ts\`  
\* \*\*Goal:\*\* Generate AI suggestions, initiate approval, guide negative offline.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`generateAndRequestApproval(reviewId)\`. Fetch data. Call AI. Generate token. Update \`Review\` record. Construct notification. Send via Comm Hub).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI as "Reputation Manager". If negative, require apology \+ direct contact info. If positive, require thanks).

\#\#\#\# \*\*Task 8.6: Implement the "Approve Reply" Handler\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand approval endpoint/webhook, Ask about triggering publish immediately vs scheduled job, Ask about user confirmation method, Await Approval)  
\* \*\*Context:\*\* API endpoint and SMS webhook handler.  
\* \*\*Goal:\*\* Securely handle user approval action.  
\* \*\*Detailed Implementation Steps:\*\* (Implement email link handler: Validate token, update status to \`approved\`, invalidate token, return success. Implement SMS handler: If "YES", update status, send confirmation SMS).

\#\#\#\# \*\*Task 8.7: Implement the "Reply-to-Edit" Handler\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand reply-to-edit workflow, Ask about parsing feedback, Ask about re-sending approval, Await Approval)  
\* \*\*Context:\*\* Inbound email/SMS webhook handler.  
\* \*\*Goal:\*\* Allow users to request revisions by replying.  
\* \*\*Detailed Implementation Steps:\*\* (Webhook processes non-"YES" replies. Parse feedback. Identify \`Review\`. Update status. Call \`reviseReplySuggestion()\` AI. Re-run Task 8.5 logic).  
\* \*\*AI Prompt Guidance:\*\* (Instruct AI to revise based on feedback).

\#\#\#\# \*\*Task 8.8: Implement the Response Publisher\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand publisher job, Ask about adding Facebook reply capability, Ask about run frequency, Ask about retry/failure status, Await Approval)  
\* \*\*Context:\*\* \`libs/reputation-hub/src/response\_publisher.ts\`  
\* \*\*Goal:\*\* Create reliable job to post approved replies to Google, Yelp, \*\*and Facebook\*\*.  
\* \*\*Detailed Implementation Steps:\*\* Enhance \`runResponsePublisher()\` job (runs frequently). Find \`approved\` reviews. Call platform API (incl. Facebook) to post reply. Handle errors/retries. Update status (\`sent\`/\`failed\`). Save \`ReviewResponse\`.

\#\#\#\# \*\*Task 8.9: Implement Review Showcasing Actions\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand showcase action dispatch, Ask about \`ADD\_WEBSITE\_TESTIMONIAL\` payload, Ask about using AI to format for social, Await Approval)  
\* \*\*Context:\*\* \`libs/reputation-hub/src/showcase\_handler.ts\`  
\* \*\*Goal:\*\* Integrate with other modules to turn positive reviews into marketing assets.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`triggerShowcaseAction(reviewId, actionType)\`. If 'website', dispatch \`ADD\_WEBSITE\_TESTIMONIAL\` command. If 'social', call AI to format, dispatch \`CREATE\_SOCIAL\_POST\_DRAFT\` command).  
\* \*\*Key Considerations:\*\* Website & Social modules must listen for these commands.

\#\#\#\# \*\*Task 8.10: Implement Review Generation Campaigns\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand review request flow, Ask about audience selection method (tags?), Ask about using Comm Hub \+ logging activity, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/flows/RequestReviewsFlow.tsx\`  
\* \*\*Goal:\*\* Enable users to proactively solicit more positive reviews.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`RequestReviewsFlow\` UI wizard: Choose Platform, Choose Audience (uses Contact Hub), Customize Message, Send. Call Comm Hub. Log event in Contact Hub).

\#\#\#\# \*\*Task 8.11: Implement Sentiment Analysis & Reporting Dashboard\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand analysis \+ reporting goal, Ask about AI criteria for flagging showcase reviews, Confirm key dashboard metrics, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/ReputationDashboard.tsx\` and \`libs/reputation-hub/src/analyzer.ts\`  
\* \*\*Goal:\*\* Provide insights into reputation trends and identify marketing opportunities.  
\* \*\*Detailed Implementation Steps:\*\* (Enhance \`runReputationAnalysis()\` job: AI identifies pos/neg themes AND flags reviews for showcasing (\`isGoodForShowcasing\`). Save themes, update review flags. Build \`ReputationDashboard\` UI: Show rating trend, key metrics, pos/neg themes).  
\* \*\*AI Prompt Guidance:\*\* (Update prompt to require theme analysis and showcase identification).

\---

\#\# Module 9 Master Specification V3: Billing & Subscription Hub

This document is the definitive technical specification and implementation guide for the \*\*Billing & Subscription Hub\*\* module. This version integrates feature entitlements, trial experience, dunning, \*\*and adds support for one-time payments\*\*.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Transparency & Clarity; Self-Service via Stripe Portal; Trust & Security; Clear Communication.  
\* \*\*AI Persona & Logic:\*\* Helpful Billing Support Persona.  
\* \*\*Code & Architecture:\*\* Stripe as Source of Truth; Webhook Driven; Secure API Key Management; Feature Entitlements mapping; \*\*Support for multiple payment modes\*\*.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 9.1: Define Core Data Structures\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand enhanced \`Subscription\` \+ \`PlanEntitlement\`, Ask about V1 entitlement details, Ask about storing entitlement map (config vs DB?), Await Approval)  
\* \*\*Context:\*\* \`libs/billing-hub/src/types.ts\`  
\* \*\*Goal:\*\* Enhance structures for subscription caching (incl. trial) and plan features.  
\* \*\*Detailed Implementation Steps:\*\* (Define \`PlanEntitlement\` structure \+ config mapping \`ENTITLEMENTS\`. Enhance \`Subscription\` interface: add \`trialEndsAt\`).  
\* \*\*Key Considerations:\*\* Update \`subscriptions\` table. Maintain entitlement map.

\#\#\#\# \*\*Task 9.2: Implement Plan Selection & Product UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand UI showing subs \+ one-time products, Ask about how to define/display one-time products (from Stripe Products?), Ask about UI separation, Await Approval)  
\* \*\*Context:\*\* \`apps/dashboard/components/PlanSelection.tsx\` & \*\*new \`apps/dashboard/components/ProductPurchase.tsx\`\*\*  
\* \*\*Goal:\*\* Allow users to choose subscriptions and purchase one-time items.  
\* \*\*Detailed Implementation Steps:\*\* Enhance \`PlanSelection\` for subs. Create \`ProductPurchase\` for one-time items (fetch from Stripe). "Buy Now" button triggers checkout (payment mode).

\#\#\#\# \*\*Task 9.3: Implement Stripe Checkout Integration\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand checkout session for subs \+ one-time, Ask about line item structure for one-time, Ask about trial logic interaction, Await Approval)  
\* \*\*Context:\*\* \`libs/billing-hub/src/checkout.ts\` (Backend API)  
\* \*\*Goal:\*\* Securely create Stripe Checkout sessions for both modes.  
\* \*\*Detailed Implementation Steps:\*\* Modify \`createCheckoutSession\` to accept \`mode: 'subscription' | 'payment'\`. Set \`mode\` and \`subscription\_data\` (if applicable) correctly in Stripe API call. Return session ID.

\#\#\#\# \*\*Task 9.4: Implement Stripe Webhook Handler\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand webhook enhancements for one-time \+ billing tags, Ask about one-time payment events, Ask about tag update logic, Await Approval)  
\* \*\*Context:\*\* API route (\`POST /api/billing/webhook\`)  
\* \*\*Goal:\*\* Reliably process all events, including one-time payments and updating contact tags.  
\* \*\*Detailed Implementation Steps:\*\* Enhance \`switch\` statement: Handle \`checkout.session.completed\` (check mode, log payment or save sub). \*\*On sub status change events, update Contact Hub tags\*\* (\`active\_customer\`, \`canceled\_customer\`) \*\*and log \`billing\_status\_change\` event\*\*. Continue handling other sub events.  
\* \*\*Key Considerations:\*\* Updating tags requires careful logic.

\#\#\#\# \*\*Task 9.5: Implement Billing Dashboard UI\*\*  
\* \*\*(Same as previous V2: Shows sub status, trial info, past\_due warnings, links to Portal)\*\*

\#\#\#\# \*\*Task 9.6: Implement Stripe Customer Portal Integration\*\*  
\* \*\*(Same as previous V2: Creates secure redirect URL)\*\*

\#\#\#\# \*\*Task 9.7: Implement AI Billing Assistant\*\*  
\* \*\*(Same as previous V2: Answers questions about subs/trials, directs to Portal)\*\*

\#\#\#\# \*\*Task 9.8: Implement Feature Gating Logic\*\*  
\* \*\*(Same as previous V2: Checks entitlements based on subscription status/plan)\*\*

\#\#\#\# \*\*Task 9.9: Implement Dunning & Communication Logic\*\*  
\* \*\*(Same as previous V2: Sends trial ending/payment failed emails via Comm Hub)\*\*

\---

\#\# Module 10 Master Specification V3: Admin Control Center

This document is the definitive technical specification and implementation guide for the \*\*Admin Control Center\*\* module. This version enhances user support tools, deepens system monitoring capabilities, adds secure management of administrator accounts, global settings, and admin broadcasts.

\#\#\# 0\. The Collaborative Workflow Mandate (MANDATORY)  
\*\*(Instructions for AI as defined above)\*\*

\#\#\# 1\. Master Implementation Guide & Overarching Principles  
\* \*\*UI/UX Philosophy:\*\* Clarity & Efficiency; Safety First (Confirmations, Audits); Role-Based Access (\`admin\`, \`super\_admin\`).  
\* \*\*AI Persona & Logic:\*\* Helpful Admin Assistant Persona (V2 Feature).  
\* \*\*Code & Architecture:\*\* Strict Access Control (Roles); Separate Application Recommended; Audit Logging Essential; Error Monitoring Integration.

\#\#\# 2\. Detailed Task Breakdown

\#\#\#\# \*\*Task 10.1: Define Core Data Structures & Access Control\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand all structs (\`FeatureFlag\`, \`AdminAuditLog\`, \`AdminInvite\`, \`JobRunLog\`, \`PlatformSetting\`), Ask about User role storage (\`role\` field vs table?), Ask about \`PlatformSetting\` value type (string vs jsonb?), Await Approval)  
\* \*\*Context:\*\* \`libs/admin-center/src/types.ts\` and user model/auth.  
\* \*\*Goal:\*\* Define structures for flags, logs, roles, invites, jobs, global settings.  
\* \*\*Detailed Implementation Steps:\*\* (Define \`FeatureFlag\`, \`AdminAuditLog\`, \`AdminInvite\`, \`JobRunLog\`. Define \`PlatformSetting\`. Enhance User model: Add \`role\` field (\`user\`, \`admin\`, \`super\_admin\`), ensure JWT reflects role).  
\* \*\*Key Considerations:\*\* Requires new tables. RBAC is critical. Jobs must log to \`job\_run\_logs\`.

\#\#\#\# \*\*Task 10.2: Implement Secure Admin Authentication & Layout\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand role guard \+ nav structure, Ask about non-admin redirect target/message, Confirm V1 nav items per role, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/\`  
\* \*\*Goal:\*\* Create secure foundation and role-aware structure.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`/admin\` entry point. Implement Auth Guard: check auth \+ role (\`admin\`/\`super\_admin\`), redirect if fail. Create admin layout \+ sidebar. Implement role-based navigation rendering).

\#\#\#\# \*\*Task 10.3: Implement Feature Flag Management UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand flag UI (view/toggle), Ask about creating flags (code vs UI?), Ask about confirmation \+ audit log necessity, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/FeatureFlagManager.tsx\`  
\* \*\*Goal:\*\* Provide simple interface to control feature rollouts.  
\* \*\*Detailed Implementation Steps:\*\* (Create component. Fetch flags. Display list with toggles. On toggle: confirm \-\> call secure API \-\> backend verifies admin, updates DB, creates Audit Log \-\> UI refreshes).

\#\#\#\# \*\*Task 10.4: Implement User Management UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand enhanced user UI (list, detail, support actions), Ask about essential list columns, Ask about deferring sub adjustments, Ask about impersonation permission level, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/UserManager.tsx\` & \`UserDetailView.tsx\`  
\* \*\*Goal:\*\* Allow admins to view users and perform essential support actions.  
\* \*\*Detailed Implementation Steps:\*\* (Create \`UserManager\` (paginated, searchable list). Row click \-\> \`UserDetailView\`. \`UserDetailView\`: Display details. Add "Send Password Reset" button (calls auth provider reset). Add "View Activity Log" button (fetches/displays \`ActivityEvent\`s). Add "Impersonate" button (secure flow, audit log, persistent banner)).

\#\#\#\# \*\*Task 10.5: Implement AI Opportunity Review UI\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand SEO opportunity review UI, Ask about info needed for decision, Ask about Approve/Reject button behavior, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/OpportunityReview.tsx\`  
\* \*\*Goal:\*\* Provide human oversight for AI Best Practices Engine.  
\* \*\*Detailed Implementation Steps:\*\* (Create component. Fetch \`pending\_review\` \`SeoOpportunity\` records. Display cards with details. Add Approve/Reject buttons. Buttons call secure API \-\> backend verifies admin, updates status, creates Audit Log \-\> UI refreshes).

\#\#\#\# \*\*Task 10.6: Implement System Monitoring Dashboard\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand enhanced dashboard (errors, jobs), Ask about error source (Sentry API?), Ask about job status display format, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/AdminDashboard.tsx\`  
\* \*\*Goal:\*\* Provide comprehensive overview of platform health.  
\* \*\*Detailed Implementation Steps:\*\* (Create/Modify \`AdminDashboard\`. Display Key Metrics (stats cards). Add Recent Errors section (fetch from error tracker API). Add Background Job Status section (query \`job\_run\_logs\`, show last run status)).

\#\#\#\# \*\*Task 10.7: Implement Admin User Management (Super Admin Only)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand admin management UI (invite/remove), Ask about invite email flow/link security, Ask about removal action (revoke vs role change?), Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/AdminManager.tsx\`  
\* \*\*Goal:\*\* Provide secure interface for Super Admins to manage admin access.  
\* \*\*Detailed Implementation Steps:\*\* (Create component (Super Admin only). List admins. Invite Admin form \-\> secure backend \-\> generate token \-\> save \`AdminInvite\` \-\> send email \-\> log action. Implement \`/accept-admin-invite\` page (validate token \-\> update user role \-\> update invite status). Remove Admin button \-\> secure backend \-\> change role \-\> log action).  
\* \*\*Key Considerations:\*\* Security is paramount. Strict role checks, secure tokens.

\#\#\#\# \*\*Task 10.8: Implement Platform Settings Management (Super Admin Only)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand global settings UI goal, Ask about V1 manageable settings (trial length?), Ask about API key management (env vars preferred?), Ask about confirmation \+ audit log, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/PlatformSettingsManager.tsx\`  
\* \*\*Goal:\*\* Provide secure interface for Super Admins to manage global configs.  
\* \*\*Detailed Implementation Steps:\*\* (Create component (Super Admin only). Fetch editable \`PlatformSetting\` records. Display list/form. Allow editing \`value\`. Save \-\> confirm \-\> secure API \-\> backend verifies role, updates DB, creates Audit Log).

\#\#\#\# \*\*Task 10.9: Implement Admin Broadcast Tool (Super Admin Only)\*\*  
\* \*\*Collaborative Checkpoint:\*\* (Stop, Understand admin broadcast tool, Ask about V1 targeting options (All? Paying?), Ask about scheduling vs immediate send, Ask about logging, Await Approval)  
\* \*\*Context:\*\* \`apps/admin-center/components/BroadcastComposer.tsx\`  
\* \*\*Goal:\*\* Allow admins to communicate important platform updates to users.  
\* \*\*Detailed Implementation Steps:\*\* (Create component (Super Admin only). Targeting options. Subject/Body composer. Send button \-\> confirm \-\> secure API \-\> backend verifies role, gets recipient list, queues jobs via Comm Hub sender \-\> create Audit Log).  
\* \*\*Key Considerations:\*\* Use background jobs for sending bulk messages.

