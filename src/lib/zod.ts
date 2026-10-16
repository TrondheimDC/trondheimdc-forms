import * as z from "zod"

// Every schema imports Zod from here, so this runs before any is built: no
// `new Function` to parse faster. The CSP has no 'unsafe-eval', and Zod's try
// at it is reported as a violation on every page load, even though Zod then
// does without.
z.config({ jitless: true })

export * from "zod"
