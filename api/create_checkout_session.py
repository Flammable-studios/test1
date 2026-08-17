"""Stripe Checkout Session creator for JobTag.

Freebuff hosting runs Python functions from `api/*.py`. This handler
creates a real Stripe Checkout Session server-side (using the secret
STRIPE_SECRET_KEY, which is never exposed to the browser) and returns
the hosted checkout URL for the client to redirect to.

Expected POST body:
    {"jobId": "...", "email": "someone@example.com", "origin": "https://app.example.com"}

Env vars:
    STRIPE_SECRET_KEY  - required, Stripe secret key (sk_...)
    STRIPE_PRICE_ID    - optional, a one-time Price ID to charge. When
                         unset, a $5.00 one-off charge is created for
                         the JobTag promotion.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request

STRIPE_API_URL = "https://api.stripe.com/v1/checkout/sessions"
PROMO_AMOUNT_USD = 500  # $5.00 in cents


def handler(event, context):
    secret = os.environ.get("STRIPE_SECRET_KEY", "")
    if not secret:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "STRIPE_SECRET_KEY is not configured"}),
        }

    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, AttributeError):
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body"})}

    job_id = str(body.get("jobId", "")).strip()
    origin = str(body.get("origin", "")).strip().rstrip("/")
    email = str(body.get("email", "")).strip()
    if not job_id or not origin:
        return {"statusCode": 400, "body": json.dumps({"error": "jobId and origin are required"})}

    price_id = os.environ.get("STRIPE_PRICE_ID", "").strip()

    form = [
        ("mode", "payment"),
        # Stripe substitutes {CHECKOUT_SESSION_ID} in the success URL.
        ("success_url", f"{origin}/?job={job_id}&session_id={{CHECKOUT_SESSION_ID}}"),
        ("cancel_url", f"{origin}/?canceled=1"),
        ("client_reference_id", job_id),
    ]
    if price_id:
        form.append(("line_items[0][price]", price_id))
        form.append(("line_items[0][quantity]", "1"))
    else:
        form.append(("line_items[0][quantity]", "1"))
        form.append(("line_items[0][price_data][currency]", "usd"))
        form.append(("line_items[0][price_data][unit_amount]", str(PROMO_AMOUNT_USD)))
        form.append(("line_items[0][price_data][product_data][name]", "JobTag promotion"))
    if email:
        form.append(("customer_email", email))

    payload = urllib.parse.urlencode(form).encode("utf-8")
    req = urllib.request.Request(
        STRIPE_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"statusCode": 200, "body": json.dumps({"url": data.get("url")})}
    except urllib.error.HTTPError as e:
        return {"statusCode": e.code, "body": e.read().decode("utf-8")}
    except Exception as e:  # noqa: BLE001 - surface any transport error
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
