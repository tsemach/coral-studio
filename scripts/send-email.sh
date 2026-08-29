#!/usr/bin/env bash

curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "mail@tsemach.org",
    "to": "tsemach.mizrachi@gmail.com",
    "subject": "Test Email from Resend",
    "html": "<p>If you see this, your setup is working!</p>"
  }'
