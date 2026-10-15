import ReactMarkdown from "react-markdown"

// Form and question descriptions are Markdown in Nextcloud Forms. Raw HTML in
// them is escaped, not rendered (react-markdown's default).
export const Markdown = ({ children }: { children: string }) => (
  <div className="space-y-3 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc">
    <ReactMarkdown
      components={{
        a: ({ node: _node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
)
