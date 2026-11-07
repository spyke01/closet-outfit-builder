# Mobile navigation and loading

Page navigation now acknowledges taps immediately. The shared sidebar, mobile navigation, and header weather remain available as the next page loads. Today, Wardrobe, Outfits, Calendar, Upcoming, Trips, and Analytics have loading layouts that match their content. Client-side wardrobe, outfit, and calendar queries keep their skeletons until data is ready. Slow requests and offline states explain the delay; failed page loads provide a retry action.

The implementation uses Next.js loading boundaries and native link status. Boneyard generates skeletons from layout snapshots; this app needs route streaming and data boundaries as well. Small local skeleton components cover those states without adding a framework dependency. See [Next.js navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating), [loading boundaries](https://nextjs.org/docs/app/api-reference/file-conventions/loading), and [Boneyard](https://github.com/0xGF/boneyard).

## Actual request work

- Layouts and primary pages share one verified user lookup per server render through React.cache. This cache never persists across requests or users. Database row-level security and server authentication remain in place.
- Today, Calendar, and Trips use the returned wardrobe rows to determine setup readiness, removing a separate database request. Query failures reach the retry boundary instead of appearing as an empty wardrobe.
- Analytics runs independent totals and entitlement queries concurrently. Its data request now runs inside Suspense so the fallback can render during the request.
- Wardrobe loads setup readiness and walkthrough preferences concurrently. Redirects no longer get caught and redirected through login.
- Shell and page membership checks share an account-specific TanStack query for one minute. Reopening Today reuses that result, avoiding another endpoint call and its Stripe synchronization work. Membership change events still refresh it, and the server still authorizes paid operations.
- A verified database-format bug caused preferences to fail validation: PostgreSQL returns microsecond timestamps with timezone offsets. The schema now accepts that valid format, allowing weather and saved themes to load successfully.
- The app shell no longer starts blanket image-upload, monitoring, and feature preloads. Next.js handles partial route prefetching for visible navigation links.

## Adversarial checks

The browser checks deliberately delay Planner responses, then select Analytics to confirm the last navigation wins. A separate delayed calendar query verifies the second loading stage, slow-request copy, offline/reconnect feedback, and reduced motion. Unknown counts and empty-state claims remain hidden until history loads. The checks cover phone/desktop layouts, both themes, all primary/planner routes, weather access, and signed-out redirects. Every test account is deleted in cleanup.

Full suite: 2,421 tests passed, four skipped. The final calendar and loading refinements also passed 20 focused checks. Strict lint, TypeScript, production build, and exact private-credential comparison against the browser bundle passed. See the JSON evidence for measured timings and scope.

The original hosted sample showed no feedback until the page appeared: about 643 ms for the first Planner visit and 593 ms for Analytics. Local feedback appeared within tens of milliseconds. These are individual synthetic-account samples, not a universal speed guarantee. The hosted browser pass also passed all scenarios, with visible navigation feedback in 17–55 ms across its five measured transitions and no extra billing requests during those transitions. See hosted-browser-validation.json and production-release.json. Existing server and weather latency can still affect content readiness; the navigation and skeletons expose that work instead of leaving the previous page looking stuck.

## Reproduce

Run a production build and local server. With the usual local Supabase variables available, run `node scripts/check-navigation-browser.mjs`. Set `PLAYWRIGHT_MODULE` if Playwright lives outside the project. The script defaults to localhost:3000; `NAV_TEST_BASE=https://www.myaioutfit.com` selects the verified production site. `NAV_TEST_OUTPUT` chooses the evidence filename. `NAV_TEST_SLOW=1` applies a simulated 150 ms RTT and 1.6 Mbps download after setup. It creates and removes an isolated account, seeds three confirmed pieces through onboarding, and never invokes AI generation or sends email.

The controlled slower-network sample showed Planner’s first heading at 556 ms (before: 699 ms), Analytics at 350 ms (before: 863 ms), and the first return to Today at 353 ms (before: 843 ms). Feedback appeared at 24–46 ms in that sample. These heading measurements do not imply that every image, background query, or outfit is ready at that point. See before-after.json for the five transitions and measurement scope.
