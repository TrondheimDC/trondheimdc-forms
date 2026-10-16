"use client"

import {
  queryOptions,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Command } from "cmdk"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ErrorIllustration,
  LoginIllustration,
} from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import {
  type AdminForm,
  LoginRequired,
  linkFor,
  loadAdminForms,
  shareHash,
} from "@/lib/admin"
import { NEXTCLOUD_URL } from "@/lib/config"
import { isLoggedIn, startLogin } from "@/lib/session"
import { cn } from "@/lib/utils"

const formsQuery = queryOptions({
  queryKey: ["admin", "forms"],
  queryFn: () =>
    isLoggedIn() ? loadAdminForms() : Promise.reject(new LoginRequired()),
})

const shareHashQuery = (id: number) =>
  queryOptions({
    queryKey: ["admin", "shareHash", id],
    queryFn: () => shareHash(id),
  })

// The forms you own or were given in Nextcloud, as a command palette: type
// to filter, Enter copies the link to share.
export const AdminContent = () => {
  const queryClient = useQueryClient()
  const list = useQuery(formsQuery)
  // Which ones have a public link: filled in as they arrive.
  const hashes = useQueries({
    queries: (list.data ?? []).map((f) => shareHashQuery(f.id)),
  })
  const forms = list.data?.map(
    (f, i): AdminForm => ({ ...f, publicHash: hashes[i]?.data }),
  )
  const [copied, setCopied] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K or / jumps to the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof Element && e.target.closest("input, textarea")
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !inField)
      ) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const copyLink = useCallback(
    async (form: AdminForm) => {
      const publicHash = await queryClient.fetchQuery(shareHashQuery(form.id))
      const link = linkFor({ ...form, publicHash })
      await navigator.clipboard.writeText(link)
      setCopied(link)
    },
    [queryClient],
  )

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 4000)
    return () => clearTimeout(timer)
  }, [copied])

  if (list.error instanceof LoginRequired) {
    return (
      <StatusScreen
        illustration={<LoginIllustration />}
        title={copy.admin.loginTitle}
        body={copy.admin.loginBody}
        actions={<Button onClick={startLogin}>{copy.admin.loginButton}</Button>}
      />
    )
  }
  if (list.error && !list.isFetching) {
    return (
      <StatusScreen
        tone="danger"
        illustration={<ErrorIllustration />}
        title={copy.admin.failedTitle}
        body={copy.admin.failedBody}
        actions={
          <Button onClick={() => void list.refetch()}>
            {copy.admin.retry}
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-3">
        <h1>{copy.admin.title}</h1>
        <p className="text-muted-foreground">{copy.admin.intro}</p>
      </header>

      <Command
        label={copy.admin.title}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        loop
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon />
          <Command.Input
            ref={input}
            autoFocus
            placeholder={copy.admin.search}
            className="h-14 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {!forms ? (
            <Command.Loading>
              <div className="space-y-2 p-2" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-background"
                  />
                ))}
              </div>
            </Command.Loading>
          ) : (
            <>
              <Command.Empty className="px-3 py-8 text-center text-muted-foreground">
                {forms.length === 0 ? (
                  <span>
                    {copy.admin.none}{" "}
                    <a
                      href={`${NEXTCLOUD_URL}/apps/forms`}
                      className="text-primary underline underline-offset-4"
                    >
                      {copy.admin.create}
                    </a>
                  </span>
                ) : (
                  copy.admin.noMatch
                )}
              </Command.Empty>
              {(["owned", "shared"] as const).map((group) => {
                const inGroup = forms.filter(
                  (f) => f.owned === (group === "owned"),
                )
                if (inGroup.length === 0) return null
                return (
                  <Command.Group
                    key={group}
                    heading={copy.admin[group]}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {inGroup.map((f) => (
                      <Row key={f.id} form={f} onCopy={copyLink} />
                    ))}
                  </Command.Group>
                )
              })}
            </>
          )}
        </Command.List>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> {copy.admin.keyMove}
          </span>
          <span>
            <Kbd>↵</Kbd> {copy.admin.keyCopy}
          </span>
        </div>
      </Command>

      <p
        aria-live="polite"
        className={cn(
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 font-display text-sm text-always-dark shadow-lg transition-[opacity,translate] duration-200 light:text-white",
          copied
            ? "opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {copied &&
          copy.admin.copied({ link: copied.replace(/^https?:\/\//, "") })}
      </p>
    </div>
  )
}

const Row = ({
  form,
  onCopy,
}: {
  form: AdminForm
  onCopy: (f: AdminForm) => Promise<void>
}) => {
  const access =
    form.publicHash === undefined
      ? null
      : form.publicHash
        ? copy.admin.public
        : copy.admin.membersOnly

  return (
    <Command.Item
      value={`${form.title} ${form.id}`}
      onSelect={() => void onCopy(form)}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 data-[selected=true]:bg-background"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base text-foreground">
          {form.title || copy.admin.untitled}
        </p>
        <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {/* Holds its place while the share links load. */}
          <span className={cn(!access && "min-w-20")}>{access ?? "…"}</span>
          {!form.open && (
            <span className="text-danger">{copy.admin.closed}</span>
          )}
          {form.submissionCount !== undefined && (
            <span>{copy.admin.answers({ count: form.submissionCount })}</span>
          )}
        </p>
      </div>
      <span className="hidden font-mono text-xs text-primary group-data-[selected=true]:inline">
        ↵ {copy.admin.keyCopy}
      </span>
      <a
        href={`${NEXTCLOUD_URL}/apps/forms/${form.hash}/edit`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        title={copy.admin.edit}
      >
        {copy.admin.editShort}
      </a>
    </Command.Item>
  )
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-border px-1 font-mono">{children}</kbd>
)

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-muted-foreground"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)
