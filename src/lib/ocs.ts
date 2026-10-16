import * as z from "./zod"

// Nextcloud's OCS answer: { ocs: { meta: { message, … }, data } }.
export const ocs = <T extends z.ZodType>(data: T) =>
  z.object({ ocs: z.object({ data }) })

// Why Nextcloud said no: the meta message, or a string as data.
export const ocsErrorSchema = z.object({
  ocs: z.object({
    meta: z.object({ message: z.string().nullish() }).nullish(),
    data: z.unknown(),
  }),
})
