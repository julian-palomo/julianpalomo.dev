import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  type ContactErrorCode,
  type ContactField,
  contactInputSchema,
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
} from "../../lib/contact/schema";
import { sendContact } from "../../lib/contact/server";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { useSoundEffects } from "../sound/Sound";
import { useTheme } from "../theme/Theme";
import { Button } from "../ui/Button";
import { CloseIcon } from "../ui/CloseIcon";
import { IconButton } from "../ui/IconButton";
import { Turnstile } from "./Turnstile";

type Status =
  | { state: "editing" }
  | { state: "sending" }
  | { state: "sent" }
  | { state: "failed"; code: ContactErrorCode };

type Fields = Record<ContactField, string>;

const EMPTY: Fields = { name: "", email: "", message: "" };
const FIELDS: readonly ContactField[] = ["name", "email", "message"];

type Props = {
  open: boolean;
  siteKey: string;
  onClose: () => void;
  /** The message went: the page's cow licks its lips. */
  onSent: () => void;
};

/**
 * The contact form (DESIGN.md section 14): a native modal <dialog>, so focus
 * stays inside while it's open, Escape closes it, and focus goes back to
 * whatever opened it. A bottom sheet on a phone and a dialog from 1024px
 * (src/styles/contact.css). It stays mounted while closed, so what the
 * visitor wrote survives closing it and a failed send.
 */
export function ContactDialog({ open, siteKey, onClose, onSent }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const locale = useLocale();
  const { theme } = useTheme();
  const { play } = useSoundEffects();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState<Record<ContactField, boolean>>({
    name: false,
    email: false,
    message: false,
  });
  const [token, setToken] = useState<string | null>(null);
  // A token is single-use: each attempt remounts Turnstile for a new one.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>({ state: "editing" });

  // The dialog is outside React's model: opening and closing it is syncing
  // with the DOM.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Each opening starts from the form, keeping what was written.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && status.state !== "editing") setStatus({ state: "editing" });
  }

  const errors = fieldErrors(fields);
  const messageTooLong = fields.message.length > MESSAGE_MAX;
  const shownError = (field: ContactField) => (touched[field] ? errors[field] : undefined);
  const errorText = (field: ContactField) => {
    const messages = t(locale, "contactFieldErrors");
    return field === "message" ? messages.message(MESSAGE_MIN) : messages[field];
  };

  const change = (field: ContactField, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    if (status.state === "failed") setStatus({ state: "editing" });
  };
  const blur = (field: ContactField) => setTouched((current) => ({ ...current, [field]: true }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status.state === "sending") return;
    setTouched({ name: true, email: true, message: true });
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    if (!token) {
      setStatus({ state: "failed", code: "verification" });
      return;
    }
    setStatus({ state: "sending" });
    let code: ContactErrorCode | null = null;
    try {
      const result = await sendContact({ data: { ...fields, website, token } });
      if (result.status === "error") code = result.code;
    } catch {
      // A request that never got an answer, or one the server refused as
      // malformed: either way the message didn't go.
      code = "send";
    }
    setToken(null);
    setAttempt((current) => current + 1);
    if (code === null) onSuccess();
    else setStatus({ state: "failed", code });
  }

  // Everything that happens when a message goes, in one place: the chat's
  // cow moos (when sound is on, under the moo's 3s rule) and licks its lips.
  function onSuccess() {
    play("moo");
    setStatus({ state: "sent" });
    setFields(EMPTY);
    setTouched({ name: false, email: false, message: false });
    onSent();
  }

  const sending = status.state === "sending";
  const failure = status.state === "failed" ? t(locale, "contactErrors")[status.code] : null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal <dialog> natively.
    <dialog
      ref={ref}
      className="contact-sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself; clicks inside land
      // on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-extrabold">
              {t(locale, "contactTitle")}
            </h2>
            <p className="text-[13px] text-muted">{t(locale, "contactSubtitle")}</p>
          </div>
          <IconButton look="tint" label={t(locale, "close")} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {status.state === "sent" ? (
          <p role="status" className="rounded-[20px] bg-tint px-4 py-3 font-medium">
            {t(locale, "contactSent")}
          </p>
        ) : (
          <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
            <TextField
              name="name"
              label={t(locale, "contactName")}
              value={fields.name}
              autoComplete="name"
              maxLength={NAME_MAX}
              error={shownError("name") ? errorText("name") : undefined}
              onChange={(value) => change("name", value)}
              onBlur={() => blur("name")}
            />
            <TextField
              name="email"
              type="email"
              label={t(locale, "contactEmail")}
              hint={t(locale, "contactEmailHint")}
              value={fields.email}
              autoComplete="email"
              error={shownError("email") ? errorText("email") : undefined}
              onChange={(value) => change("email", value)}
              onBlur={() => blur("email")}
            />
            <MessageField
              label={t(locale, "contactMessage")}
              value={fields.message}
              // Too long, the counter turns red and says by how much.
              error={shownError("message") && !messageTooLong ? errorText("message") : undefined}
              onChange={(value) => change("message", value)}
              onBlur={() => blur("message")}
            />
            <Honeypot label={t(locale, "contactWebsite")} value={website} onChange={setWebsite} />
            {open && (
              <Turnstile
                key={attempt}
                siteKey={siteKey}
                locale={locale}
                theme={theme}
                onToken={setToken}
              />
            )}
            {failure && (
              <p role="alert" className="rounded-[20px] bg-tint px-4 py-3 text-sm">
                {failure}
              </p>
            )}
            <Button look="primary" type="submit" aria-disabled={sending}>
              {t(locale, sending ? "contactSending" : "contactSend")}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}

/** Which fields fail the form's schema, checked one at a time. */
function fieldErrors(fields: Fields): Record<ContactField, boolean> {
  const { shape } = contactInputSchema;
  return {
    name: !shape.name.safeParse(fields.name).success,
    email: !shape.email.safeParse(fields.email).success,
    message: !shape.message.safeParse(fields.message).success,
  };
}

const field =
  "rounded-[24px] border-2 border-field-border bg-field px-4 py-2.5 text-base focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-transparent focus-visible:ring-4 focus-visible:ring-accent/22 aria-invalid:border-danger";
const labelClass = "text-[12.5px] font-semibold text-muted";

type TextFieldProps = {
  name: ContactField;
  label: string;
  value: string;
  type?: "text" | "email";
  hint?: string;
  error: string | undefined;
  autoComplete: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function TextField({ name, label, value, type = "text", hint, error, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={rest.autoComplete}
        maxLength={rest.maxLength}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy}
        onChange={(event) => rest.onChange(event.target.value)}
        onBlur={rest.onBlur}
        className={field}
      />
      {hint && (
        <p id={hintId} className="text-[12.5px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type MessageFieldProps = {
  label: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
};

/** The message, with the composer's counter under it (DESIGN.md section 10). */
function MessageField({ label, value, error, onChange, onBlur }: MessageFieldProps) {
  const locale = useLocale();
  const id = useId();
  const errorId = useId();
  const counterId = useId();
  const over = value.length - MESSAGE_MAX;
  const counterText =
    over > 0
      ? t(locale, "counterOver")(over, MESSAGE_MAX)
      : t(locale, "counter")(value.length, MESSAGE_MAX);
  const counterClass = over > 0 ? "text-danger" : "text-muted";
  const describedBy = error ? `${errorId} ${counterId}` : counterId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        name="message"
        value={value}
        rows={5}
        aria-invalid={error !== undefined || over > 0}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`${field} resize-y`}
      />
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        {error && (
          <p id={errorId} className="text-danger">
            {error}
          </p>
        )}
        <p id={counterId} className={`ml-auto ${counterClass}`}>
          {counterText}
        </p>
      </div>
    </div>
  );
}

/**
 * The field only bots fill in: off screen, out of the tab order and hidden
 * from screen readers, so a person never meets it. Not `display: none`, which
 * some bots skip.
 */
function Honeypot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
