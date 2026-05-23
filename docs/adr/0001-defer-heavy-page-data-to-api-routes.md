# Defer Heavy Page Data To API Routes

Interactive app pages should render the route shell quickly and fetch heavy business data through API routes with client-side loading, empty, and error states. Server-rendered page data is still allowed for authentication, layout, redirects, and small fast reference data, but stock prices, portfolio valuations, statistics, and large lists should not block the initial page transition because they can depend on external APIs, cache misses, or expensive aggregation.

For the 301/302 stock performance work, this means request-time KIS price refresh, market-sensitive portfolio valuation, and stock subpage list data share one boundary: they should not block user-facing route transitions. Cron/prewarm jobs and market-state-based cache validity are related optimizations, but they are outside this decision's immediate implementation scope.
