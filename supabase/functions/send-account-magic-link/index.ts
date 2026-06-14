// supabase/functions/send-account-magic-link/index.ts
// Public — validates customer email, generates magic link, sends branded account email via Resend.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = Deno.env.get('SITE_URL') || 'https://bysolum.co.uk';

function buildEmail(magicLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your SOLUM account login link</title>
</head>
<body style="margin:0;padding:0;background:#08090b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090b;padding:48px 24px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <!-- Wordmark -->
      <tr><td style="padding-bottom:44px;">
        <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIzODAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCAzODAgNzAiPgogIDxkZWZzPgo8cGF0aCBpZD0iZm9udF84XzE2IiBkPSJNLjYxNDc0NjEgLjIwNzYyNjM1Qy42MTQ3NDYxIC4xNjQ5NjI3NyAuNjAyNzAxODcgLjEyNzI2MzM4IC41Nzg2MTMzIC4wOTQ1MjgyIC41NTQ1MjQ3IC4wNjE4MDMxOCAuNTIyNTQyMyAuMDM2ODkwNjY4IC40ODI2NjYwMyAuMDE5NzkwNjUgLjQ0Mjc4OTcgLjAwMjY5MDYzMyAuMzk4NjAwMjYtLjAwNTg1OTM3NSAuMzUwMDk3NjctLjAwNTg1OTM3NSAuMzA5NzMzMDctLjAwNTg1OTM3NSAuMjczMjc0NzYtLjAwMjExNTg4NTYgLjI0MDcyMjY2IC4wMDUzNzEwOTM5IC4yMDgxNzA1OCAuMDEyODU4MDczIC4xODExNTIzNSAuMDIzMTkzMzYgLjE1OTY2Nzk3IC4wMzYzNzY5NTQgLjEzODE4MzYgLjA0OTU2MDU0OCAuMTE5NzkxNjY3IC4wNjQyMDg5ODggLjEwNDQ5MjE5IC4wODAzMjIyNjkgLjA4OTE5MjcxIC4wOTY0MzU1NSAuMDc3MzkyNTggLjExNDI1NzgxIC4wNjkwOTE4IC4xMzM3ODkwNiAuMDYwNzkxMDE3IC4xNTMzMjAzMSAuMDU0NzY4ODggLjE3MTc5MzYzIC4wNTEwMjUzOSAuMTg5MjA4OTkgLjA0NzI4MTkwNCAuMjA2NjI0MzUgLjA0NTI0NzM5NiAuMjI0NjA5MzggLjA0NDkyMTg3NiAuMjQzMTY0MDZILjEzNDI3NzM1Qy4xNDExMTMyOCAuMTg4NDc2NTYgLjE2MzAwNDU2IC4xNDcxMzU0MiAuMTk5OTUxMTcgLjExOTE0MDYyOCAuMjM2ODk3NzggLjA5MTE0NTgzOSAuMjg1NDgxNzkgLjA3NzE0ODQ0IC4zNDU3MDMxMyAuMDc3MTQ4NDQgLjM3NzYwNDE3IC4wNzcxNDg0NCAuNDA2OTAxMDQgLjA4MTM5MDM4IC40MzM1OTM3NiAuMDg5ODc0MjcgLjQ2MDI4NjQ4IC4wOTgzNTgxNTggLjQ4MjUwMzI4IC4xMTIxNDE5MyAuNTAwMjQ0MTcgLjEzMTIyNTU5IC41MTc5ODUwNyAuMTUwMzE5NDEgLjUyNjg1NTQ5IC4xNzMyNDMyMSAuNTI2ODU1NDkgLjE5OTk5Njk1IC41MjY4NTU0OSAuMjE1NjUyNDcgLjUyMzM1NjE2IC4yMjk1OTkgLjUxNjM1NzQgLjI0MTgzNjU1IC41MDkzNTg3IC4yNTQwNzQxIC41MDA4OTUyIC4yNjM2OTczIC40OTA5NjY4IC4yNzA3MDYxOSAuNDgxMDM4NDMgLjI3NzcyNTIzIC40Njc3NzM0NSAuMjg0MTY5NTMgLjQ1MTE3MTg4IC4yOTAwMzkwNyAuNDM0NTcwMyAuMjk1OTE4OCAuNDE5NzU5MTMgLjMwMDM0ODkgLjQwNjczODI5IC4zMDMzMjk0OCAuMzkzNzE3NDUgLjMwNjMxMDA0IC4zNzcxOTcyOCAuMzEwMDU4NiAuMzU3MTc3NzQgLjMxNDU3NTIgLjMzNzE1ODIgLjMxOTEwMTk3IC4zMjIxMDI4OCAuMzIyNTM1MiAuMzEyMDExNzMgLjMyNDg3NDg5IC4yOTE1MDM5IC4zMjk2MjU0NyAuMjczOTI1NzkgLjMzMzcxNDggLjI1OTI3NzM1IC4zMzcxNDI5NSAuMjQ0NjI4OSAuMzQwNTcxMDkgLjIyODM1Mjg2IC4zNDU1MzUyOSAuMjEwNDQ5MjIgLjM1MjAzNTUzIC4xOTI1NDU1OCAuMzU4NTQ1OTQgLjE3NzQwODg2IC4zNjUyMTQwMyAuMTY1MDM5MDYgLjM3MjAzOTggLjE1MjY2OTI3IC4zNzg4NzU3NCAuMTQwMjE4MSAuMzg3MTcxNDMgLjEyNzY4NTU1IC4zOTY5MjY4OSAuMTE1MTUyOTkgLjQwNjY5MjUgLjEwNTE0MzIzIC40MTczNDgyNSAuMDk3NjU2MjUgLjQyODg5NDA1IC4wOTAxNjkyNyAuNDQwNDUwMDUgLjA4NDA2NTc2IC40NTM4NzI2OSAuMDc5MzQ1NyAuNDY5MTYyIC4wNzQ2MjU2NSAuNDg0NDUxMyAuMDcyMjY1NjI4IC41MDEwNDI2OSAuMDcyMjY1NjI4IC41MTg5MzYxOCAuMDcyMjY1NjI4IC41NTkzMjExIC4wODM0MTQ3MSAuNTk0NjU1MzYgLjEwNTcxMjg5IC42MjQ5Mzg5OSAuMTI4MDExMDcgLjY1NTIzMjcgLjE1ODEyMTc1IC42NzgyNzg2IC4xOTYwNDQ5MiAuNjk0MDc2NTYgLjIzMzk2ODEgLjcwOTg3NDQ4IC4yNzY2OTI3MyAuNzE3NzczNDYgLjMyNDIxODc2IC43MTc3NzM0NiAuMzk5NzM5NiAuNzE3NzczNDYgLjQ2MjA3NjggLjY5ODQ0NTYgLjUxMTIzMDQ5IC42NTk3OTAwNiAuNTYwMzg0MSAuNjIxMTQ0NiAuNTg3NzI3ODcgLjU2NjU3OTE5IC41OTMyNjE3IC40OTYwOTM3NkguNTAyNDQxNEMuNDk3NTU4NiAuNTM3OTQzNTcgLjQ3OTczNjM0IC41NzE1MTc5NyAuNDQ4OTc0NiAuNTk2ODE3IC40MTgyMTI5IC42MjIxMTYxIC4zNzc5Mjk3IC42MzQ3NjU2IC4zMjgxMjUgLjYzNDc2NTYgLjI3Nzk5NDc5IC42MzQ3NjU2IC4yMzc0Njc0NiAuNjI1MjE4NyAuMjA2NTQyOTcgLjYwNjEyNDkgLjE3NTYxODQ5IC41ODcwNDEyIC4xNjAxNTYyNSAuNTYwMzQ4NSAuMTYwMTU2MjUgLjUyNjA0Njc4IC4xNjAxNTYyNSAuNTE3OTU5NiAuMTYxMjk1NTggLjUxMDI3NDI2IC4xNjM1NzQyMiAuNTAyOTkwNyAuMTY1ODUyODYgLjQ5NTcxNzM5IC4xNjg3ODI1NSAuNDg5MjQ3NjYgLjE3MjM2MzI4IC40ODM1ODE1NSAuMTc1OTQ0MDIgLjQ3NzkxNTQ1IC4xODA3NDU0NCAuNDcyNDkzNSAuMTg2NzY3NTggLjQ2NzMxNTY4IC4xOTI3ODk3MiAuNDYyMTQ4MDUgLjE5ODU2NzcgLjQ1NzcwMjY1IC4yMDQxMDE1NiAuNDUzOTc5NSAuMjA5NjM1NDIgLjQ1MDI1NjM2IC4yMTY2MzQxMSAuNDQ2NjE0NiAuMjI1MDk3NjYgLjQ0MzA1NDIgLjIzMzU2MTIgLjQzOTQ5MzggLjI0MDk2NjggLjQzNjU3OTM5IC4yNDczMTQ0NiAuNDM0MzEwOSAuMjUzNjYyMSAuNDMyMDUyNiAuMjYxNjM3MzcgLjQyOTgzNSAuMjcxMjQwMjQgLjQyNzY1ODA5IC4yODA4NDMxIC40MjU0OTEzNCAuMjg4NTc0MjMgLjQyMzc2MiAuMjk0NDMzNiAuNDIyNDcwMSAuMzAwMjkyOTggLjQyMTE3ODIgLjMwNzk0MjczIC40MTk0OTk3NCAuMzE3MzgyOCAuNDE3NDM0NyAuMzI2ODIyOSAuNDE1Mzc5ODYgLjMzMzY1ODg1IC40MTM4NjQxNSAuMzM3ODkwNjMgLjQxMjg4NzU4IC4zNDU3MDMxMyAuNDExMTk4OTUgLjM1ODQ3OTg0IC40MDg0MjY5IC4zNzYyMjA3IC40MDQ1NzE1NCAuMzkzOTYxNTkgLjQwMDcxNjE3IC40MDg5MzU1NiAuMzk3NDU1ODUgLjQyMTE0MjU5IC4zOTQ3OTA2NiAuNDMzMzQ5NiAuMzkyMTM1NjMgLjQ0ODQwNDk1IC4zODgwOTcxNSAuNDY2MzA4NiAuMzgyNjc1MTggLjQ4NDIxMjI2IC4zNzcyNjM0IC40OTk0MzAzNCAuMzcxNjAyNCAuNTExOTYyOSAuMzY1NjkyMTUgLjUyNDQ5NTQgLjM1OTc4MTkgLjUzNzY3OSAuMzUxODIxOSAuNTUxNTEzNyAuMzQxODEyMTQgLjU2NTM0ODMgLjMzMTgwMjM4IC41NzY0OTc0IC4zMjA4MDU4OSAuNTg0OTYwOTYgLjMwODgyMjY0IC41OTM0MjQ1IC4yOTY4Mzk0IC42MDA1MDQ2IC4yODIxNDUxOCAuNjA2MjAxMiAuMjY0NzQgLjYxMTg5Nzc5IC4yNDczNDQ5NyAuNjE0NzQ2MSAuMjI4MzA3MDkgLjYxNDc0NjEgLjIwNzYyNjM1WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF83IiBkPSJNLjU2NzYyNjk4IC4wMzgzNjA1OTdDLjUxNjM1NzQgLjAwODg4MDYxNSAuNDU3MzU2NzktLjAwNTg1OTM3NSAuMzkwNjI1LS4wMDU4NTkzNzUgLjMyMzg5MzIzLS4wMDU4NTkzNzUgLjI2NDg5MjU5IC4wMDg4ODA2MTUgLjIxMzYyMzA1IC4wMzgzNjA1OTcgLjE2MjM1MzUyIC4wNjc4NDA1NzkgLjEyMjM5NTgzOSAuMTA5OTM5NTc4IC4wOTM3NSAuMTY0NjU3NiAuMDY1MTA0MTY3IC4yMTkzODU3OSAuMDUwNzgxMjUgLjI4Mjc0NTM3IC4wNTA3ODEyNSAuMzU0NzM2MzQgLjA1MDc4MTI1IC40MjYwNzYyNyAuMDY0NDUzMTI4IC40ODkxMDUyMyAuMDkxNzk2ODc4IC41NDM4MjMyNyAuMTE5MTQwNjI4IC41OTg1NTE0OCAuMTU4NjEwMDMgLjY0MTIyNTE4IC4yMTAyMDUwOCAuNjcxODQ0NSAuMjYxODAwMTUgLjcwMjQ2MzggLjMyMTk0MDEgLjcxNzc3MzQ2IC4zOTA2MjUgLjcxNzc3MzQ2IC40NTkzMDk5IC43MTc3NzM0NiAuNTE5NDQ5OSAuNzAyNDYzOCAuNTcxMDQ0OSAuNjcxODQ0NSAuNjIyNjM5OTggLjY0MTIyNTE4IC42NjIxMDk0IC41OTg1NTE0OCAuNjg5NDUzMSAuNTQzODIzMjcgLjcxNjc5NjkgLjQ4OTEwNTIzIC43MzA0Njg3NyAuNDI2MDc2MjcgLjczMDQ2ODc3IC4zNTQ3MzYzNCAuNzMwNDY4NzcgLjI4Mjc0NTM3IC43MTYxNDU4IC4yMTkzODU3OSAuNjg3NSAuMTY0NjU3NiAuNjU4ODU0MiAuMTA5OTM5NTc4IC42MTg4OTY1IC4wNjc4NDA1NzkgLjU2NzYyNjk4IC4wMzgzNjA1OTdNLjU3NDk1MTIgLjU1NzA1MjZDLjUyOTg2NjUgLjYwODg2MTI5IC40Njg0MjQ0OCAuNjM0NzY1NiAuMzkwNjI1IC42MzQ3NjU2IC4zMTI4MjU1NCAuNjM0NzY1NiAuMjUxMzgzNDYgLjYwODg2MTI5IC4yMDYyOTg4MyAuNTU3MDUyNiAuMTYxMjE0MTkgLjUwNTI1NDEgLjEzODY3MTg4IC40Mzc4MTUzNSAuMTM4NjcxODggLjM1NDczNjM0IC4xMzg2NzE4OCAuMjcwMzU1MjMgLjE2MTEzMjgxIC4yMDI5OTI3NSAuMjA2MDU0NjkgLjE1MjY0ODkzIC4yNTA5NzY1NyAuMTAyMzE1MjcgLjMxMjUgLjA3NzE0ODQ0IC4zOTA2MjUgLjA3NzE0ODQ0IC40Njg3NSAuMDc3MTQ4NDQgLjUzMDI3MzQ2IC4xMDIzMTUyNyAuNTc1MTk1MyAuMTUyNjQ4OTMgLjYyMDExNzIgLjIwMjk5Mjc1IC42NDI1NzgxIC4yNzAzNTUyMyAuNjQyNTc4MSAuMzU0NzM2MzQgLjY0MjU3ODEgLjQzNzgxNTM1IC42MjAwMzU4IC41MDUyNTQxIC41NzQ5NTEyIC41NTcwNTI2WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xNCIgZD0iTS4wNzMyNDIxOSAwVi43MDgwMDc4SC4xNjExMzI4MVYuMDgzMDA3ODFILjUxNzU3ODFWMEguMDczMjQyMTlaIi8+CiAgICA8cGF0aCBpZD0iZm9udF84XzE1IiBkPSJNLjM2MDM1MTU3IC4wNzcxNDg0NEMuMzkwNjI1IC4wNzcxNDg0NCAuNDE3MTU0OTUgLjA4MDQ4NTAyIC40Mzk5NDE0IC4wODcxNTgyIC40NjI3Mjc4OCAuMDkzODQxNTUgLjQ4MTI4MjU3IC4xMDI5NjYzMSAuNDk1NjA1NDggLjExNDUzMjQ3IC41MDk5Mjg0IC4xMjYwOTg2NCAuNTIxNDg0NCAuMTQwNTEzMSAuNTMwMjczNDYgLjE1Nzc3NTg4IC41MzkwNjI1IC4xNzUwMzg2NSAuNTQ1MTY2IC4xOTMxOTY2MSAuNTQ4NTg0IC4yMTIyNDk3NiAuNTUyMDAxOTggLjIzMTMxMzA3IC41NTM3MTA5NiAuMjUyNzM2NDMgLjU1MzcxMDk2IC4yNzY1MTk3OVYuNzA4MDA3OEguNjQxNjAxNTlWLjI3NjA3NzI4Qy42NDE2MDE1OSAuMDg4MTE5NTEgLjU0Nzg1MTU5LS4wMDU4NTkzNzUgLjM2MDM1MTU3LS4wMDU4NTkzNzUgLjE3MjUyNjA1LS4wMDU4NTkzNzUgLjA3ODYxMzI4IC4wODgxMTk1MSAuMDc4NjEzMjggLjI3NjA3NzI4Vi43MDgwMDc4SC4xNjY1MDM5Vi4yNzY1MTk3OUMuMTY2NTAzOSAuMjQ2MjI2IC4xNjk0MzM2IC4yMTk3NTcwOCAuMTc1MjkyOTcgLjE5NzExMzA0IC4xODExNTIzNSAuMTc0NDY5IC4xOTA5OTkzNSAuMTUzNzgzMTYgLjIwNDgzMzk5IC4xMzUwNTU1NCAuMjE4NjY4NjMgLjExNjMyNzkyIC4yMzg2MDY3NyAuMTAxOTk0ODM4IC4yNjQ2NDg0NSAuMDkyMDU2Mjc4IC4yOTA2OTAxIC4wODIxMTc3MTcgLjMyMjU5MTE3IC4wNzcxNDg0NCAuMzYwMzUxNTcgLjA3NzE0ODQ0WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xIiBkPSJNLjA3NDIxODc1IDBWLjcwODAwNzhILjE2MjEwOTM4TC40MTU1MjczNSAuMDY0OTQxNDA5IC42Njg5NDUzIC43MDgwMDc4SC43NTY4MzU5NlYwSC42Njg5NDUzVi40NjI5NjY5M0wuNDg2MzI4MTMgMEguMzQ0NzI2NTdMLjE2MjEwOTM4IC40NzA5NDcyOFYwSC4wNzQyMTg3NVoiLz4KICA8L2RlZnM+Cjx1c2UgZGF0YS10ZXh0PSJTIiB4bGluazpocmVmPSIjZm9udF84XzE2IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMTQuMzk0NTI5LDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJPIiB4bGluazpocmVmPSIjZm9udF84XzciIHRyYW5zZm9ybT0ibWF0cml4KDQ3Ljk3MDkyNiwwLDAsLTQ3Ljk3MDkyNiw5MS4yOTE5Miw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KICA8dXNlIGRhdGEtdGV4dD0iTCIgeGxpbms6aHJlZj0iI2ZvbnRfOF8xNCIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDE3My41MTQxLDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJVIiB4bGluazpocmVmPSIjZm9udF84XzE1IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMjQ1LjEzNDcsNjYuODU1NDEpIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHVzZSBkYXRhLXRleHQ9Ik0iIHhsaW5rOmhyZWY9IiNmb250XzhfMSIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDMyNC43MTg0OSw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+" alt="SOLUM" width="140" height="26" style="display:block;border:0;" />
      </td></tr>

      <!-- Eyebrow -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.07);padding-top:36px;padding-bottom:12px;">
        <span style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(240,236,226,0.50);font-weight:700;">
          Your Account
        </span>
      </td></tr>

      <!-- Heading -->
      <tr><td style="padding-bottom:20px;">
        <h1 style="margin:0;font-size:38px;letter-spacing:0.03em;color:#f0ece2;font-weight:700;line-height:1.1;">
          Sign in to SOLUM.
        </h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding-bottom:36px;">
        <p style="margin:0;font-size:16px;color:rgba(240,236,226,0.80);line-height:1.7;">
          Click the button below to access your account.<br/>
          This link expires in <strong style="color:#f0ece2;">1 hour</strong> and can only be used once.
        </p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding-bottom:40px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#f0ece2;">
              <a href="${magicLink}"
                 style="display:inline-block;background:#f0ece2;color:#08090b;
                        font-size:13px;letter-spacing:4px;text-transform:uppercase;
                        font-weight:700;padding:20px 48px;text-decoration:none;
                        line-height:1;">
                ACCESS MY ACCOUNT
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Link fallback -->
      <tr><td style="padding-bottom:40px;">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.35);font-weight:600;">
          Button not working?
        </p>
        <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.40);line-height:1.6;word-break:break-all;">
          ${magicLink}
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(240,236,226,0.06);padding-top:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.28);line-height:1.6;">
          You requested a login link for your SOLUM account. If this wasn't you, ignore this email — nothing will happen.
        </p>
        <p style="margin:0;font-size:12px;color:rgba(240,236,226,0.28);">
          SOLUM · bysolum.co.uk · <a href="mailto:contact@bysolum.co.uk" style="color:rgba(240,236,226,0.28);text-decoration:none;">contact@bysolum.co.uk</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let email: string;
  try {
    const body = await req.json();
    email = body?.email?.trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid_body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing_email' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Confirm a customer account exists for this email
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!customer) {
    return new Response(JSON.stringify({ ok: false, reason: 'no_account' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const genRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      redirect_to: `${SITE_URL}/account`,
    }),
  });

  if (!genRes.ok) {
    const err = await genRes.text();
    console.error('[send-account-magic-link] generate_link error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'link_generation_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const genData = await genRes.json();
  const magicLink: string = genData.action_link;
  if (!magicLink) {
    console.error('[send-account-magic-link] no action_link in response:', JSON.stringify(genData));
    return new Response(JSON.stringify({ ok: false, reason: 'link_generation_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    return new Response(JSON.stringify({ ok: false, reason: 'resend_not_configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
      to: [email],
      subject: 'Your SOLUM account login link',
      html: buildEmail(magicLink),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-account-magic-link] Resend error:', err);
    return new Response(JSON.stringify({ ok: false, reason: 'send_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
