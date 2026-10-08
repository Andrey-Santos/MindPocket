"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n"

type DeviceText = ReturnType<typeof useT>["device"]

type VerifyStatus = "idle" | "loading" | "pending" | "approved" | "denied" | "error"

interface DeviceApprovalCardProps {
  initialUserCode: string
  userName: string
}

interface ApiErrorShape {
  error?: string
  error_description?: string
  message?: string
}

function normalizeUserCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function formatUserCode(value: string) {
  const clean = normalizeUserCode(value)
  if (clean.length <= 4) {
    return clean
  }
  return `${clean.slice(0, 4)}-${clean.slice(4)}`
}

async function parseError(response: Response, d: DeviceText) {
  const text = await response.text()
  if (!text) {
    return d.requestFailed.replace("{status}", String(response.status))
  }

  try {
    const data = JSON.parse(text) as ApiErrorShape
    return (
      data.error_description ||
      data.message ||
      data.error ||
      d.requestFailed.replace("{status}", String(response.status))
    )
  } catch {
    return text
  }
}

async function fetchVerificationStatus(value: string, d: DeviceText) {
  const formatted = formatUserCode(value)
  if (!normalizeUserCode(formatted)) {
    return {
      status: "error" as const,
      message: d.enterCode,
    }
  }

  const response = await fetch(`/api/auth/device?user_code=${encodeURIComponent(formatted)}`, {
    credentials: "include",
  })

  if (!response.ok) {
    return {
      status: "error" as const,
      message: await parseError(response, d),
    }
  }

  const data = (await response.json()) as { status?: "pending" | "approved" | "denied" }
  const nextStatus = data.status ?? "error"

  if (nextStatus === "pending") {
    return {
      status: nextStatus,
      message: d.pending,
    }
  }

  if (nextStatus === "approved") {
    return {
      status: nextStatus,
      message: d.alreadyApproved,
    }
  }

  if (nextStatus === "denied") {
    return {
      status: nextStatus,
      message: d.alreadyDenied,
    }
  }

  return {
    status: "error" as const,
    message: d.unknownStatus,
  }
}

function getDecisionMessage(decision: "approve" | "deny", d: DeviceText) {
  if (decision === "approve") {
    return d.approvedMessage
  }

  return d.deniedMessage
}

export function DeviceApprovalCard({ initialUserCode, userName }: DeviceApprovalCardProps) {
  const d = useT().device
  const [userCodeInput, setUserCodeInput] = useState(formatUserCode(initialUserCode))
  const [status, setStatus] = useState<VerifyStatus>(initialUserCode ? "loading" : "idle")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null)

  const cleanUserCode = useMemo(() => normalizeUserCode(userCodeInput), [userCodeInput])

  useEffect(() => {
    if (!initialUserCode) {
      return
    }

    const runVerification = async () => {
      setStatus("loading")
      setMessage("")

      const result = await fetchVerificationStatus(initialUserCode, d)
      setStatus(result.status)
      setMessage(result.message)
    }

    runVerification()
  }, [initialUserCode, d])

  const verifyCode = async (value: string) => {
    setStatus("loading")
    setMessage("")

    const result = await fetchVerificationStatus(value, d)
    setStatus(result.status)
    setMessage(result.message)
  }

  const handleDecision = async (decision: "approve" | "deny") => {
    const formatted = formatUserCode(cleanUserCode)
    setSubmitting(decision)
    setMessage("")

    const response = await fetch(`/api/auth/device/${decision}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ userCode: formatted }),
    })

    setSubmitting(null)

    if (!response.ok) {
      setStatus("error")
      setMessage(await parseError(response, d))
      return
    }

    setStatus(decision === "approve" ? "approved" : "denied")
    setMessage(getDecisionMessage(decision, d))
  }

  const statusContent =
    status === "loading" ? (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {d.verifying}
      </span>
    ) : (
      <span>{message || d.idleHint}</span>
    )

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>{d.title}</CardTitle>
        <CardDescription>
          {d.descriptionPrefix}
          {userName || d.currentAccount}
          {d.descriptionSuffix}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="user-code">
            {d.userCode}
          </label>
          <div className="flex gap-2">
            <Input
              autoCapitalize="characters"
              autoCorrect="off"
              id="user-code"
              onChange={(event) => setUserCodeInput(formatUserCode(event.target.value))}
              placeholder={d.userCodePlaceholder}
              value={userCodeInput}
            />
            <Button onClick={() => verifyCode(userCodeInput)} type="button" variant="outline">
              {d.verify}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm">{statusContent}</div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row">
        <Button
          className="flex-1"
          disabled={status !== "pending" || submitting !== null}
          onClick={() => handleDecision("approve")}
          type="button"
        >
          {submitting === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : d.approve}
        </Button>
        <Button
          className="flex-1"
          disabled={status !== "pending" || submitting !== null}
          onClick={() => handleDecision("deny")}
          type="button"
          variant="outline"
        >
          {submitting === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : d.deny}
        </Button>
      </CardFooter>
    </Card>
  )
}
