"""Resend email sender for JobTag.

Freebuff hosting runs Python functions from `api/*.py`. This handler
receives a JSON POST body and sends an email through the Resend REST
API using the server-side RESEND_API_KEY (never exposed to the browser).

Expected POST body:
    {"to": "someone@example.com", "subject": "...", "text": "..."}

Optional env var:
    RESEND_FROM  - verified sender address (defaults to Resend's onboarding address)
"""

import json
import os
import urllib.error
import urllib.request

RESEND_API_URL = "https://api.resend.com/emails"


def handler(event, context):
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "RESEND_API_KEY is not configured"}),
        }

    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, AttributeError):
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body"})}

    to = str(body.get("to", "")).strip()
    subject = str(body.get("subject", "")).strip()
    text = str(body.get("text", "")).strip()
    if not to or not subject or not text:
        return {"statusCode": 400, "body": json.dumps({"error": "to, subject, text are required"})}

    payload = json.dumps(
        {
            "from": os.environ.get("RESEND_FROM", "JobTag <onboarding@resend.dev>"),
            "to": [to],
            "subject": subject,
            "text": text,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"statusCode": resp.status, "body": resp.read().decode("utf-8")}
    except urllib.error.HTTPError as e:
        return {"statusCode": e.code, "body": e.read().decode("utf-8")}
    except Exception as e:  # noqa: BLE001 - surface any transport error
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
