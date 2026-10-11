/* Portfolio content — edit here to update the site. */
window.PORTFOLIO = {
  projects: [
    {
      id: "avp1", tab: "ai", icon: "shield",
      title: "AVP1 Prior Authorization Agents",
      short: "Prior auth & cost estimation for surgical appointments across Anthem, Molina, Wellcare and more.",
      client: "Thoughtful.ai · AVP1A & AVP1B",
      stack: ["Python", "Robocorp", "Selenium", "PyWinAuto", "GraphQL", "GPT-4o", "AWS Textract"],
      points: [
        "Automated prior authorization and patient cost estimation for surgical appointments: pulls daily appointments from NextGen, verifies eligibility on Clearwave, and submits payer-specific requests via the Samacare GraphQL API.",
        "Processed appointments in parallel batches of 20; a companion agent routes excluded cases through UHC, Optum and Wellmed portals with automated Outlook OTP retrieval and writes results back to NextGen."
      ]
    },
    {
      id: "avp3", tab: "ai", icon: "card",
      title: "AVP3 Payment Posting Agent",
      short: "End-to-end payment posting from 9 banking portals and 835 EDI files into NextGen.",
      client: "Thoughtful.ai · Eye care practice network",
      stack: ["Python", "Robocorp", "Selenium", "PyAutoGUI", "PyWinAuto", "PyPDF", "Smartsheet", "Docker"],
      points: [
        "Retrieves deposits and ACH reports from 9 banking portals, parses 835 EDI files and EOBs from Waystar, and matches payments to patient encounters.",
        "Posts payments into NextGen using Immediate, Quick or Full Post strategies selected by batch-balancing validation — handling provider-level adjustments, secondary insurance and unposted encounter reconciliation."
      ]
    },
    {
      id: "med1", tab: "ai", icon: "eye",
      title: "MED1-CAM Vision Claims Agent",
      short: "Daily vision claims across 5 payer portals with a 30+ rule claim scrubbing engine.",
      client: "Thoughtful.ai · Vision claims management",
      stack: ["Python", "Robocorp", "Playwright", "Redis (Lua)", "Paramiko (SFTP)", "PGPy", "Microsoft 365"],
      points: [
        "Automated daily vision claims submission across 5 payer portals (VSP API, Versant, EyeMed, Avesis, iCare) from PGP-encrypted SFTP queues, with a 30+ rule claim scrubbing engine and automated rework of Experian rejections.",
        "Built a Redis-backed distributed credential manager using atomic Lua scripts, letting parallel work items grouped by billing EIN safely share portal logins."
      ]
    },
    {
      id: "tpp", tab: "ai", icon: "layers",
      title: "T-Payer-Portal Shared Library",
      short: "One typed interface over 50+ dental, vision and medical payer portals.",
      client: "Thoughtful.ai · Python monorepo",
      stack: ["Python", "Playwright", "Pydantic", "Stedi (EDI)", "OpenTelemetry", "uv", "Mypy", "Pytest"],
      points: [
        "Developed packages in a Python monorepo covering 50+ payer portals behind one typed interface (Login, Eligibility, EOB/Claims, Prior Authorization), so bots switch payers without code changes.",
        "Pluggable authentication (Bitwarden/Keeper vaults, TOTP MFA, Gmail/Outlook OTP, CAPTCHA solving), OpenTelemetry tracing and PII-masked logging, with CI enforcing type checks and 90%+ unit test coverage."
      ]
    },
    {
      id: "oms", tab: "fs", icon: "grid",
      title: "OMS — Office Management System",
      short: "Multi-tenant SaaS for HR, attendance, payroll, accounting and projects.",
      client: "Full Stack Developer",
      stack: ["FastAPI", "DRF", "PostgreSQL", "Redis", "Celery", "React", "TypeScript", "AWS"],
      points: [
        "Contributed to a multi-tenant SaaS platform migrated from a Django REST Framework monolith to 6 FastAPI microservices with per-tenant PostgreSQL schemas.",
        "Services share JWT and tenant verification through a private Python package, communicate via Redis pub/sub, and serve React micro-frontends (single-spa); deployed with Docker and Nginx to AWS through GitLab CI/CD."
      ]
    },
    {
      id: "pos", tab: "fs", icon: "bag",
      title: "Enigmatix POS Till & Pharmacy POS",
      short: "Odoo 18 + React POS with till, kitchen display and back-office interfaces.",
      client: "Full Stack Odoo Developer",
      stack: ["Python", "Odoo 18", "PostgreSQL", "OWL", "React 19", "TypeScript", "Redux"],
      points: [
        "Extended Odoo 18 POS, Inventory, Accounting, Sales, Loyalty and HR apps through upgrade-safe custom modules exposing 40+ REST APIs to a React front end with 3 role-based interfaces: cashier till, Kitchen Display System and Back Office dashboard.",
        "Delivered multi-branch operations, PIN token login, the full order lifecycle (payments, refunds, voids, discounts) and scheduled End-of-Day cash reconciliation; the pharmacy edition adds batch/lot and expiry tracking with stock alerts."
      ]
    },
    {
      id: "oono", tab: "fs", icon: "spark",
      title: "OONO — Brand & Collection Platform",
      short: "REST APIs for brands, collections and stories with S3-synced carousels.",
      client: "Full Stack Developer",
      stack: ["Node.js", "Express.js", "MongoDB", "AWS S3", "JWT"],
      points: [
        "Built REST APIs for users, brands, collections and stories with JWT access control.",
        "Synchronized carousel JSON stored on AWS S3 automatically as collections and stories changed."
      ]
    }
  ],

  industries: [
    { tags: "Healthcare · AI Agents", mark: "Prior Auth", title: "Automating prior authorization for surgical appointments", project: "avp1" },
    { tags: "Healthcare · Payments", mark: "835 / EOB", title: "Posting payments for an eye care practice network from 9 banking portals", project: "avp3" },
    { tags: "Vision · Claims", mark: "Claims", title: "Scrubbing and submitting daily vision claims across 5 payer portals", project: "med1" },
    { tags: "Healthcare · Platform", mark: "50+ Portals", title: "One typed library behind 50+ dental, vision and medical payer portals", project: "tpp" },
    { tags: "Retail · Restaurant", mark: "POS Till", title: "Running tills and kitchen displays on Odoo 18 with a React front end", project: "pos" },
    { tags: "Pharmacy", mark: "Rx POS", title: "Batch, lot and expiry tracking with stock alerts for pharmacies", project: "pos" },
    { tags: "SaaS · HR & Finance", mark: "OMS", title: "Multi-tenant office management on 6 FastAPI microservices", project: "oms" },
    { tags: "Fashion · Brands", mark: "OONO", title: "Brand, collection and story APIs with S3-synced carousels", project: "oono" }
  ],

  skills: [
    ["Languages", ["Python", "JavaScript", "TypeScript", "SQL", "HTML5", "CSS3"]],
    ["Backend & Frameworks", ["FastAPI", "Django", "Django REST Framework", "Node.js", "Express.js", "Odoo 18 (Modules, ORM, OWL, QWeb)"]],
    ["Frontend & Mobile", ["React", "Redux Toolkit", "Tailwind CSS", "Material UI", "Micro-Frontends (single-spa)", "React Native"]],
    ["Automation & RPA", ["Robocorp", "RPA Framework", "Selenium", "Playwright", "PyWinAuto", "UIAutomation", "PyAutoGUI", "BeautifulSoup4", "Windows Desktop Automation", "MFA/OTP & CAPTCHA Handling"]],
    ["AI & Document Processing", ["AI Agents", "OpenAI API (GPT-4o)", "LLM Structured Output", "AWS Textract (OCR)", "OpenCV", "PyPDF", "Cursor"]],
    ["APIs & Architecture", ["REST API Design", "GraphQL", "Microservices", "Multi-Tenancy", "Redis Pub/Sub", "Async Programming", "Celery", "EDI (835, Stedi)"]],
    ["Databases & Data", ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLAlchemy", "SQLModel", "Alembic", "Pydantic", "Pandas", "OpenPyXL"]],
    ["Security & Auth", ["JWT", "TOTP/2FA", "RBAC", "PGP Encryption", "SFTP", "Bitwarden", "Keeper", "PII Masking"]],
    ["Cloud & DevOps", ["AWS (S3, EC2, ECR, Lambda, Textract, CodeArtifact)", "Docker", "Docker Compose", "Nginx", "GitLab CI/CD", "Bitbucket Pipelines"]],
    ["Testing & Observability", ["Pytest", "Mypy", "Ruff", "pre-commit", "OpenTelemetry", "Structlog", "BugSnag", "Prometheus", "Grafana"]],
    ["Integrations", ["Microsoft 365 (Outlook, SharePoint)", "Google Sheets / Drive / Gmail", "Slack SDK", "Smartsheet", "Stripe"]],
    ["Tools & Practices", ["Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Postman", "Notion", "uv", "Agile / Scrum"]]
  ]
};
