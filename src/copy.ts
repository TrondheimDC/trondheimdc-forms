// All of the site's own text, in one place. The forms themselves are in
// whatever language they were written in, in Nextcloud.
export const copy = {
  meta: {
    description: "Feedback, sign-ups and surveys from TrondheimDC.",
  },
  menu: {
    skipToContent: "Skip to content",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    login: "Log in",
    logout: "Log out",
    loggedInAs: ({ name }: { name: string }) => `Logged in as ${name}`,
  },
  form: {
    requiredNote: "Questions marked * are required.",
    required: "required",
    anonymous: "Answers are anonymous.",
    expires: ({ date }: { date: string }) => `Open until ${date}.`,
    submit: "Submit",
    submitting: "Sending …",
    other: "Other",
    otherPlaceholder: "Write your own answer",
    choose: "Choose …",
    from: "From",
    to: "To",
    moveUp: ({ item }: { item: string }) => `Move “${item}” up`,
    moveDown: ({ item }: { item: string }) => `Move “${item}” down`,
    keepOrder: "Use this order",
    orderChosen: "Order chosen.",
    fixErrors: ({ count }: { count: number }) =>
      count === 1
        ? "One answer needs fixing before you can submit."
        : `${count} answers need fixing before you can submit.`,
    errorServer: ({ message }: { message: string }) =>
      `Nextcloud did not accept the answer: ${message}`,
    errorGeneric:
      "Something went wrong and your answer was not sent. Try again in a moment.",
    sample: "Sample form. Answers are not sent anywhere.",
    unsupportedTitle: "This form has to be filled in on Nextcloud",
    unsupportedBody: "It has questions we can't show here yet.",
    openInNextcloud: "Open the form in Nextcloud",
    closedTitle: "This form is closed",
    closedBody: "It is no longer taking answers.",
    thanksTitle: "Thanks for your answer!",
    thanksDefault: "Your answer has been recorded.",
    alreadyTitle: "You have already answered",
    alreadyBody: "Thanks! This form takes one answer per person.",
    again: "Send another answer",
    answeringAs: ({ name }: { name: string }) =>
      `You are answering as ${name}.`,
    progress: ({ answered, total }: { answered: number; total: number }) =>
      `${answered} of ${total} answered`,
    progressLabel: "Progress",
    chosenOf: ({ count, max }: { count: number; max: number }) =>
      `${count} of ${max} chosen`,
    chooseExactly: ({ count }: { count: number }) => `Choose ${count}.`,
    chooseBetween: ({ min, max }: { min: number; max: number }) =>
      `Choose between ${min} and ${max}.`,
    chooseAtLeast: ({ count }: { count: number }) =>
      `Choose at least ${count}.`,
    chooseAtMost: ({ count }: { count: number }) => `Choose up to ${count}.`,
    rankHint: "Drag, or use the arrows.",
    moved: ({ item, position }: { item: string; position: number }) =>
      `“${item}” is now number ${position}.`,
    cell: ({ row, column }: { row: string; column: string }) =>
      `${row}: ${column}`,
    chooseFile: "Choose a file",
    chooseFiles: "Choose files",
    uploading: "Uploading …",
    removeFile: ({ name }: { name: string }) => `Remove “${name}”`,
    // Forms' file types, by its name for them.
    fileKinds: new Map([
      ["image", "images"],
      ["x-office/document", "documents"],
      ["x-office/presentation", "presentations"],
      ["x-office/spreadsheet", "spreadsheets"],
    ]),
    fileKindsHint: ({ kinds }: { kinds: string[] }) => {
      const list =
        kinds.length > 1
          ? `${kinds.slice(0, -1).join(", ")} or ${kinds.at(-1)}`
          : (kinds[0] ?? "")
      return `${list.charAt(0).toUpperCase()}${list.slice(1)}.`
    },
    fileLimitsHint: ({ count, size }: { count: number; size?: string }) => {
      if (count === 1) return size ? `One file, up to ${size}.` : "One file."
      if (count > 1)
        return size
          ? `Up to ${count} files, ${size} each.`
          : `Up to ${count} files.`
      return size ? `Files can be up to ${size} each.` : null
    },
    fileTooBig: ({ name, size }: { name: string; size: string }) =>
      `“${name}” is too big. Files can be up to ${size}.`,
    tooManyFiles: ({ count }: { count: number }) =>
      count === 1
        ? "You can only upload one file."
        : `You can upload up to ${count} files.`,
    uploadTooBig: "That file is too big to upload here.",
    uploadFailed: ({ message }: { message: string }) =>
      `The upload didn't work: ${message}`,
    uploadFailedGeneric: "The upload didn't work. Try again in a moment.",
    draftRestored: "We kept the answers you had started on.",
    clearDraft: "Start over",
  },
  // What a question shows when its answer won't do, as Forms' own checks
  // would say it (src/questions).
  problem: {
    required: "This question is required.",
    min: ({ count }: { count: number }) => `Choose at least ${count}.`,
    max: ({ count }: { count: number }) => `Choose at most ${count}.`,
    email: "Enter a valid email address.",
    phone: "Enter a valid phone number.",
    number: "Enter a number.",
    regex: "The answer is not in the right format.",
    range: "“To” can't be before “From”.",
    bothEnds: "Fill in both “From” and “To”.",
    outOfRange: ({
      what,
      min,
      max,
    }: {
      what: "date" | "time"
      min?: string
      max?: string
    }) =>
      min && max
        ? `Choose a ${what} from ${min} to ${max}.`
        : min
          ? `Choose a ${what} no earlier than ${min}.`
          : `Choose a ${what} no later than ${max}.`,
    color: "Choose a colour.",
    files: ({ count }: { count: number }) =>
      count === 1 ? "Upload only one file." : `Upload at most ${count} files.`,
    uploading: "Wait for the upload to finish.",
  },
  notFound: {
    title: "Page not found",
    body: "The link is old or mistyped. Our forms are shared with a link of their own.",
    back: "To trondheimdc.no",
  },
  footer: {
    contact: "connect@trondheimdc.no",
    orgNr: "Org no.",
  },
  load: {
    loading: "Loading the form",
    expiredTitle: "This form is closed",
    expiredBody: "It is no longer taking answers.",
    notfoundTitle: "Form not found",
    notfoundBody: "The link is wrong, or the form is no longer shared.",
    failedTitle: "Couldn't load the form",
    failedBody: "Try reloading the page in a moment.",
    loginTitle: "Log in to answer",
    loginBody: "This form is only for users of TrondheimDC's Nextcloud.",
    loginButton: "Log in with Nextcloud",
    loginFailed: "Logging in didn't work. Try again.",
    openInNextcloud: "Open the form in Nextcloud",
    forbiddenTitle: "You don't have access",
    forbiddenBody: "You are logged in, but this form isn't shared with you.",
    retry: "Try again",
    loggingIn: "Logging in",
  },
  error: {
    code: "Error",
    title: "Something went wrong",
    body: "Try again. If that doesn't help, tell connect@trondheimdc.no.",
    retry: "Try again",
  },
  admin: {
    title: "Your forms",
    intro:
      "The forms you own or have access to in Nextcloud. Search, and press Enter to copy the link to share.",
    search: "Search your forms …",
    owned: "Yours",
    shared: "Shared with you",
    public: "Public",
    membersOnly: "Logged-in only",
    closed: "Closed",
    answers: ({ count }: { count: number }) =>
      count === 1 ? "1 answer" : `${count} answers`,
    untitled: "(untitled)",
    keyMove: "move",
    keyCopy: "copy link",
    copied: ({ link }: { link: string }) => `Copied: ${link}`,
    edit: "Edit in Nextcloud",
    editShort: "Edit",
    none: "You have no forms yet.",
    create: "Make one in Nextcloud",
    noMatch: "No forms match.",
    loginTitle: "Log in to see your forms",
    loginBody:
      "This is where the links to your forms in TrondheimDC's Nextcloud are.",
    loginButton: "Log in with Nextcloud",
    failedTitle: "Couldn't load your forms",
    failedBody: "Try reloading the page in a moment.",
    retry: "Try again",
  },
}
