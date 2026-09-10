import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  const lastUpdated = "September 10, 2026";

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-surface border border-foreground/10 rounded-3xl p-6 sm:p-10 shadow-sm">
        {/* Navigation & Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">🍳</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Privacy Policy &amp; Data Protection
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-foreground/60 mt-1">
            Kitchen Quest Kids • Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground/80 leading-relaxed text-sm sm:text-base">
          {/* Introduction */}
          <section>
            <p>
              Welcome to <strong>Kitchen Quest Kids</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
              We provide interactive culinary games, recipes, and educational kitchen adventures designed specifically
              for children.
            </p>
            <p className="mt-2">
              Protecting the safety, security, and privacy of young learners and their families is our highest priority.
              This document outlines our comprehensive policies on data handling, child privacy, data retention,
              explicit deletion mechanisms, and preventative security measures in accordance with the{" "}
              <strong>Children’s Online Privacy Protection Act (COPPA)</strong>, the{" "}
              <strong>General Data Protection Regulation (GDPR)</strong>, and global standards.
            </p>
          </section>

          {/* Core Principles */}
          <section className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <span>🛡️</span> Our Core Child Safety Principles
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>No Direct Child Accounts:</strong> Accounts must be created, authorized, and managed by a parent or legal guardian.</li>
              <li><strong>Zero Third-Party Advertising:</strong> No behavioral ads, banners, commercial trackers, or marketing pop-ups.</li>
              <li><strong>No Open Social Feeds or Chat:</strong> Children cannot message strangers, publish personal photos, or broadcast live updates.</li>
              <li><strong>Parental Gate Protection:</strong> Sensitive operations (child profile creation/deletion, dashboard settings, external links) require passing a parental challenge.</li>
            </ul>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">A. Information Provided by Parents</h3>
                <p className="text-sm mt-1">
                  When you register a parent account, we collect your first name, last name, and email address. 
                  Passwords are cryptographic hashes created via salted algorithms; plain-text passwords are never stored.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">B. Child Profiles (Parent-Curated Only)</h3>
                <p className="text-sm mt-1">
                  Parents can add child chef profiles. To minimize exposure, we collect only:
                </p>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  <li><strong>Display Moniker:</strong> A chosen first name or nickname (e.g., &quot;Chef Leo&quot;).</li>
                  <li><strong>Age Range:</strong> Used solely to match age-appropriate recipes and safety guidelines.</li>
                  <li><strong>Avatar Assets:</strong> Pre-made icons unlocked via gameplay. We never allow camera photo uploads for child avatars.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">C. In-App Activity &amp; Progression</h3>
                <p className="text-sm mt-1">
                  We track XP points, cooking streaks, completed game quiz results, and smart grocery checklist states.
                  This data stays tied to your private family profile.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">D. Technical Device Logs</h3>
                <p className="text-sm mt-1">
                  Standard network diagnostics (IP address, operating system, browser type) are collected strictly for
                  system security, rate-limiting, and error tracking. They are never paired with personal child identifiers.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>Deliver core game loops, load Flavor Hub regions, and calculate culinary streaks.</li>
              <li>Power the Parent Dashboard to give parents complete visibility into child progress.</li>
              <li>Prompt safety warnings (&quot;waiting for a grown-up&quot;) on knife and heat recipe steps.</li>
              <li>Deliver essential transactional emails (account activation, password resets).</li>
              <li>Prevent unauthorized access and detect abusive or automated traffic.</li>
            </ul>
          </section>

          {/* Offline Grocery List */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Offline Smart Grocery List</h2>
            <p className="text-sm">
              The Smart Grocery Checklist utilizes client-side storage to remain usable without active internet access.
              When connectivity returns, locally queued ingredient checks synchronize securely with your family record.
            </p>
          </section>

          {/* Third-Party Service Providers */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Third-Party Service Providers</h2>
            <p className="text-sm">
              We do <strong>not</strong> sell, rent, or monetize your or your child&apos;s data. We share technical data
              exclusively with cloud infrastructure providers under strict processing agreements:
            </p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
              <li><strong>Cloud Hosting &amp; Database:</strong> Secure servers hosting MongoDB and API microservices.</li>
              <li><strong>Transactional Email:</strong> SMTP/API services used strictly to send parent authentication emails.</li>
            </ul>
          </section>

          {/* Parental Rights */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Parental Control &amp; Data Rights</h2>
            <p className="text-sm">
              Parents maintain complete authority over their family records. Through the Parent Dashboard or by contacting us, you can:
            </p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
              <li>Inspect any child profile, activity log, or achievement.</li>
              <li>Modify or correct child monikers and age categories.</li>
              <li>Delete individual child chefs or permanently close your entire family account.</li>
              <li>Revoke data collection consent at any time.</li>
            </ul>
          </section>

          {/* 6. Data Deletion Policy */}
          <section className="border-t border-foreground/10 pt-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>🗑️</span> 6. Data Deletion Policy
            </h2>
            <p className="text-sm text-foreground/80 mb-4">
              We uphold the principle of storage limitation. You have complete ownership and on-demand control
              over the permanent removal of your family and child records:
            </p>

            <ul className="space-y-3 list-none pl-0 text-sm">
              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">Self-Service Child Profile Removal:</strong> Parents can delete individual child profiles directly from the <em>Manage Children</em> screen inside the Parent Dashboard behind the Parental Gate.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">Immediate Progress &amp; Activity Unlinking:</strong> Deleting a child immediately detaches and purges all corresponding XP balances, streak counters, completed quiz scores, and ingredient checklists from active application queries.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">Full Account Termination:</strong> Parents can request total erasure of their master account, all associated child profiles, and all historical records by selecting <em>Delete Account</em> in account settings or by emailing <a href="mailto:privacy@kitchenquestkids.com" className="text-primary underline">privacy@kitchenquestkids.com</a>.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">48-Hour Live Database Purge:</strong> Confirmed deletion requests cascade across all live database collections, removing personal identifying fields and child profiles within 48 hours.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">30-Day Automated Backup Expiry:</strong> Encrypted, rolling database disaster-recovery backups overwrite historical snapshots within a 30-day lifecycle. No orphaned child data is retained beyond this window.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">Local Device Cache Clearing:</strong> Deleting an account or signing out purges locally stored offline grocery lists, avatar preferences, and session tokens from the user&apos;s browser and device storage.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-primary font-bold text-base mt-0.5">•</span>
                <div>
                  <strong className="text-foreground">No Secondary Retention:</strong> Kitchen Quest Kids does not archive, sell, or retain child interaction data for research or commercial use once an account deletion is finalized.
                </div>
              </li>
            </ul>
          </section>

          {/* 7. Data Prevention & Protection Policy */}
          <section className="border-t border-foreground/10 pt-6">
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span>🔒</span> 7. Data Prevention &amp; Protection Safeguards
            </h2>
            <p className="text-sm text-foreground/80 mb-4">
              We employ preventative architectural controls and defense-in-depth measures to eliminate data exposure,
              prevent leaks, and block unauthorized access:
            </p>

            <ul className="space-y-3 list-none pl-0 text-sm">
              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Data Minimization by Design:</strong> We prevent hazards by never asking for high-risk data. Real surnames for children, physical home addresses, telephone numbers, and precise GPS locations are never requested or stored.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">No Media, Camera, or Mic Access:</strong> Children cannot upload personal photos, record voice clips, or capture video for avatars or profiles. Avatars are strictly selected from pre-designed, curated in-game illustrations.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Zero Social Channels or Public Feeds:</strong> The platform contains no chat rooms, open direct messaging, public leaderboards, or friend search features, preventing minors from communicating with outside parties.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Mathematical Parental Gate:</strong> Sensitive routes (child profile creation, deletion, account settings, external web links) require passing a dynamic challenge (<code>x-parental-gate-token</code>) to ensure minors cannot alter account data.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Zero Third-Party Tracking SDKs:</strong> We operate without commercial advertising SDKs, behavioral tracking scripts, cross-app trackers, or retargeting pixels.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Transport Layer &amp; At-Rest Encryption:</strong> All communications require HTTPS with TLS 1.3 encryption. Passwords are salted and hashed using bcrypt. Refresh credentials use <code>HttpOnly</code>, <code>SameSite</code> cookies to prevent script-based token harvesting.
                </div>
              </li>

              <li className="p-3 bg-surface border border-foreground/10 rounded-xl flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-base mt-0.5">✔</span>
                <div>
                  <strong className="text-foreground">Automated Attack Prevention &amp; Rate Limiting:</strong> Endpoints are protected with IP rate-limiting, Zod schema validation, NoSQL injection sanitizers, and Helmet HTTP security headers to protect against cross-site scripting (XSS) and brute-force attacks.
                </div>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="border-t border-foreground/10 pt-6">
            <h2 className="text-xl font-bold text-foreground mb-2">8. Contact Our Child Privacy Team</h2>
            <p className="text-sm">
              If you have questions about our COPPA commitments or wish to submit an immediate data deletion request,
              reach out directly:
            </p>
            <div className="mt-3 p-4 bg-foreground/5 rounded-xl text-sm font-medium">
              <p>Kitchen Quest Kids Privacy &amp; Data Security Office</p>
              <p className="text-primary mt-1">
                Email:{" "}
                <a href="mailto:privacy@kitchenquestkids.com" className="underline">
                  privacy@kitchenquestkids.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}