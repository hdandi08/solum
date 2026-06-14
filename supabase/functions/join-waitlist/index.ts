import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.info','guerrillamail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','spam4.me',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.io','trashmail.at',
  'trashmail.org','trashmail.xyz','trashmail.app','yopmail.com','yopmail.fr',
  'cool.fr.nf','jetable.fr.nf','nospam.ze.tc','nomail.xl.cx','mega.zik.dj',
  'speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf',
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '10minutemail.co.za','10minutemail.info','minutemail.com','20minutemail.com',
  'dispostable.com','mailnull.com','maildrop.cc','throwam.com','throwam.net',
  'tempmail.com','tempmail.net','tempmail.org','tempmail.de','tempr.email',
  'tempinbox.com','discard.email','fakeinbox.com','mailnesia.com','pookmail.com',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org','getnada.com',
  'nada.email','mohmal.com','getonemail.com','filzmail.com','binkmail.com',
  'bob.email','mailinater.com','spamavert.com','mytrashmail.com','crazymailing.com',
])

function isValidFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, 'MX')
    return records.length > 0
  } catch {
    return false
  }
}


function buildConfirmEmail(email: string, firstName: string | null, _token: string, _position: number): string {
  const greeting = firstName ? firstName : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're on the list — SOLUM</title>
<style>
  body,#bgwrap{background-color:#08090B !important;}
</style>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:0;">
<tr><td align="center" bgcolor="#08090B" style="background-color:#08090B;padding:0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:#08090B;padding:32px 48px 26px;border-bottom:1px solid #181c24;">
    <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIzODAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCAzODAgNzAiPgogIDxkZWZzPgo8cGF0aCBpZD0iZm9udF84XzE2IiBkPSJNLjYxNDc0NjEgLjIwNzYyNjM1Qy42MTQ3NDYxIC4xNjQ5NjI3NyAuNjAyNzAxODcgLjEyNzI2MzM4IC41Nzg2MTMzIC4wOTQ1MjgyIC41NTQ1MjQ3IC4wNjE4MDMxOCAuNTIyNTQyMyAuMDM2ODkwNjY4IC40ODI2NjYwMyAuMDE5NzkwNjUgLjQ0Mjc4OTcgLjAwMjY5MDYzMyAuMzk4NjAwMjYtLjAwNTg1OTM3NSAuMzUwMDk3NjctLjAwNTg1OTM3NSAuMzA5NzMzMDctLjAwNTg1OTM3NSAuMjczMjc0NzYtLjAwMjExNTg4NTYgLjI0MDcyMjY2IC4wMDUzNzEwOTM5IC4yMDgxNzA1OCAuMDEyODU4MDczIC4xODExNTIzNSAuMDIzMTkzMzYgLjE1OTY2Nzk3IC4wMzYzNzY5NTQgLjEzODE4MzYgLjA0OTU2MDU0OCAuMTE5NzkxNjY3IC4wNjQyMDg5ODggLjEwNDQ5MjE5IC4wODAzMjIyNjkgLjA4OTE5MjcxIC4wOTY0MzU1NSAuMDc3MzkyNTggLjExNDI1NzgxIC4wNjkwOTE4IC4xMzM3ODkwNiAuMDYwNzkxMDE3IC4xNTMzMjAzMSAuMDU0NzY4ODggLjE3MTc5MzYzIC4wNTEwMjUzOSAuMTg5MjA4OTkgLjA0NzI4MTkwNCAuMjA2NjI0MzUgLjA0NTI0NzM5NiAuMjI0NjA5MzggLjA0NDkyMTg3NiAuMjQzMTY0MDZILjEzNDI3NzM1Qy4xNDExMTMyOCAuMTg4NDc2NTYgLjE2MzAwNDU2IC4xNDcxMzU0MiAuMTk5OTUxMTcgLjExOTE0MDYyOCAuMjM2ODk3NzggLjA5MTE0NTgzOSAuMjg1NDgxNzkgLjA3NzE0ODQ0IC4zNDU3MDMxMyAuMDc3MTQ4NDQgLjM3NzYwNDE3IC4wNzcxNDg0NCAuNDA2OTAxMDQgLjA4MTM5MDM4IC40MzM1OTM3NiAuMDg5ODc0MjcgLjQ2MDI4NjQ4IC4wOTgzNTgxNTggLjQ4MjUwMzI4IC4xMTIxNDE5MyAuNTAwMjQ0MTcgLjEzMTIyNTU5IC41MTc5ODUwNyAuMTUwMzE5NDEgLjUyNjg1NTQ5IC4xNzMyNDMyMSAuNTI2ODU1NDkgLjE5OTk5Njk1IC41MjY4NTU0OSAuMjE1NjUyNDcgLjUyMzM1NjE2IC4yMjk1OTkgLjUxNjM1NzQgLjI0MTgzNjU1IC41MDkzNTg3IC4yNTQwNzQxIC41MDA4OTUyIC4yNjM2OTczIC40OTA5NjY4IC4yNzA3MDYxOSAuNDgxMDM4NDMgLjI3NzcyNTIzIC40Njc3NzM0NSAuMjg0MTY5NTMgLjQ1MTE3MTg4IC4yOTAwMzkwNyAuNDM0NTcwMyAuMjk1OTE4OCAuNDE5NzU5MTMgLjMwMDM0ODkgLjQwNjczODI5IC4zMDMzMjk0OCAuMzkzNzE3NDUgLjMwNjMxMDA0IC4zNzcxOTcyOCAuMzEwMDU4NiAuMzU3MTc3NzQgLjMxNDU3NTIgLjMzNzE1ODIgLjMxOTEwMTk3IC4zMjIxMDI4OCAuMzIyNTM1MiAuMzEyMDExNzMgLjMyNDg3NDg5IC4yOTE1MDM5IC4zMjk2MjU0NyAuMjczOTI1NzkgLjMzMzcxNDggLjI1OTI3NzM1IC4zMzcxNDI5NSAuMjQ0NjI4OSAuMzQwNTcxMDkgLjIyODM1Mjg2IC4zNDU1MzUyOSAuMjEwNDQ5MjIgLjM1MjAzNTUzIC4xOTI1NDU1OCAuMzU4NTQ1OTQgLjE3NzQwODg2IC4zNjUyMTQwMyAuMTY1MDM5MDYgLjM3MjAzOTggLjE1MjY2OTI3IC4zNzg4NzU3NCAuMTQwMjE4MSAuMzg3MTcxNDMgLjEyNzY4NTU1IC4zOTY5MjY4OSAuMTE1MTUyOTkgLjQwNjY5MjUgLjEwNTE0MzIzIC40MTczNDgyNSAuMDk3NjU2MjUgLjQyODg5NDA1IC4wOTAxNjkyNyAuNDQwNDUwMDUgLjA4NDA2NTc2IC40NTM4NzI2OSAuMDc5MzQ1NyAuNDY5MTYyIC4wNzQ2MjU2NSAuNDg0NDUxMyAuMDcyMjY1NjI4IC41MDEwNDI2OSAuMDcyMjY1NjI4IC41MTg5MzYxOCAuMDcyMjY1NjI4IC41NTkzMjExIC4wODM0MTQ3MSAuNTk0NjU1MzYgLjEwNTcxMjg5IC42MjQ5Mzg5OSAuMTI4MDExMDcgLjY1NTIzMjcgLjE1ODEyMTc1IC42NzgyNzg2IC4xOTYwNDQ5MiAuNjk0MDc2NTYgLjIzMzk2ODEgLjcwOTg3NDQ4IC4yNzY2OTI3MyAuNzE3NzczNDYgLjMyNDIxODc2IC43MTc3NzM0NiAuMzk5NzM5NiAuNzE3NzczNDYgLjQ2MjA3NjggLjY5ODQ0NTYgLjUxMTIzMDQ5IC42NTk3OTAwNiAuNTYwMzg0MSAuNjIxMTQ0NiAuNTg3NzI3ODcgLjU2NjU3OTE5IC41OTMyNjE3IC40OTYwOTM3NkguNTAyNDQxNEMuNDk3NTU4NiAuNTM3OTQzNTcgLjQ3OTczNjM0IC41NzE1MTc5NyAuNDQ4OTc0NiAuNTk2ODE3IC40MTgyMTI5IC42MjIxMTYxIC4zNzc5Mjk3IC42MzQ3NjU2IC4zMjgxMjUgLjYzNDc2NTYgLjI3Nzk5NDc5IC42MzQ3NjU2IC4yMzc0Njc0NiAuNjI1MjE4NyAuMjA2NTQyOTcgLjYwNjEyNDkgLjE3NTYxODQ5IC41ODcwNDEyIC4xNjAxNTYyNSAuNTYwMzQ4NSAuMTYwMTU2MjUgLjUyNjA0Njc4IC4xNjAxNTYyNSAuNTE3OTU5NiAuMTYxMjk1NTggLjUxMDI3NDI2IC4xNjM1NzQyMiAuNTAyOTkwNyAuMTY1ODUyODYgLjQ5NTcxNzM5IC4xNjg3ODI1NSAuNDg5MjQ3NjYgLjE3MjM2MzI4IC40ODM1ODE1NSAuMTc1OTQ0MDIgLjQ3NzkxNTQ1IC4xODA3NDU0NCAuNDcyNDkzNSAuMTg2NzY3NTggLjQ2NzMxNTY4IC4xOTI3ODk3MiAuNDYyMTQ4MDUgLjE5ODU2NzcgLjQ1NzcwMjY1IC4yMDQxMDE1NiAuNDUzOTc5NSAuMjA5NjM1NDIgLjQ1MDI1NjM2IC4yMTY2MzQxMSAuNDQ2NjE0NiAuMjI1MDk3NjYgLjQ0MzA1NDIgLjIzMzU2MTIgLjQzOTQ5MzggLjI0MDk2NjggLjQzNjU3OTM5IC4yNDczMTQ0NiAuNDM0MzEwOSAuMjUzNjYyMSAuNDMyMDUyNiAuMjYxNjM3MzcgLjQyOTgzNSAuMjcxMjQwMjQgLjQyNzY1ODA5IC4yODA4NDMxIC40MjU0OTEzNCAuMjg4NTc0MjMgLjQyMzc2MiAuMjk0NDMzNiAuNDIyNDcwMSAuMzAwMjkyOTggLjQyMTE3ODIgLjMwNzk0MjczIC40MTk0OTk3NCAuMzE3MzgyOCAuNDE3NDM0NyAuMzI2ODIyOSAuNDE1Mzc5ODYgLjMzMzY1ODg1IC40MTM4NjQxNSAuMzM3ODkwNjMgLjQxMjg4NzU4IC4zNDU3MDMxMyAuNDExMTk4OTUgLjM1ODQ3OTg0IC40MDg0MjY5IC4zNzYyMjA3IC40MDQ1NzE1NCAuMzkzOTYxNTkgLjQwMDcxNjE3IC40MDg5MzU1NiAuMzk3NDU1ODUgLjQyMTE0MjU5IC4zOTQ3OTA2NiAuNDMzMzQ5NiAuMzkyMTM1NjMgLjQ0ODQwNDk1IC4zODgwOTcxNSAuNDY2MzA4NiAuMzgyNjc1MTggLjQ4NDIxMjI2IC4zNzcyNjM0IC40OTk0MzAzNCAuMzcxNjAyNCAuNTExOTYyOSAuMzY1NjkyMTUgLjUyNDQ5NTQgLjM1OTc4MTkgLjUzNzY3OSAuMzUxODIxOSAuNTUxNTEzNyAuMzQxODEyMTQgLjU2NTM0ODMgLjMzMTgwMjM4IC41NzY0OTc0IC4zMjA4MDU4OSAuNTg0OTYwOTYgLjMwODgyMjY0IC41OTM0MjQ1IC4yOTY4Mzk0IC42MDA1MDQ2IC4yODIxNDUxOCAuNjA2MjAxMiAuMjY0NzQgLjYxMTg5Nzc5IC4yNDczNDQ5NyAuNjE0NzQ2MSAuMjI4MzA3MDkgLjYxNDc0NjEgLjIwNzYyNjM1WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF83IiBkPSJNLjU2NzYyNjk4IC4wMzgzNjA1OTdDLjUxNjM1NzQgLjAwODg4MDYxNSAuNDU3MzU2NzktLjAwNTg1OTM3NSAuMzkwNjI1LS4wMDU4NTkzNzUgLjMyMzg5MzIzLS4wMDU4NTkzNzUgLjI2NDg5MjU5IC4wMDg4ODA2MTUgLjIxMzYyMzA1IC4wMzgzNjA1OTcgLjE2MjM1MzUyIC4wNjc4NDA1NzkgLjEyMjM5NTgzOSAuMTA5OTM5NTc4IC4wOTM3NSAuMTY0NjU3NiAuMDY1MTA0MTY3IC4yMTkzODU3OSAuMDUwNzgxMjUgLjI4Mjc0NTM3IC4wNTA3ODEyNSAuMzU0NzM2MzQgLjA1MDc4MTI1IC40MjYwNzYyNyAuMDY0NDUzMTI4IC40ODkxMDUyMyAuMDkxNzk2ODc4IC41NDM4MjMyNyAuMTE5MTQwNjI4IC41OTg1NTE0OCAuMTU4NjEwMDMgLjY0MTIyNTE4IC4yMTAyMDUwOCAuNjcxODQ0NSAuMjYxODAwMTUgLjcwMjQ2MzggLjMyMTk0MDEgLjcxNzc3MzQ2IC4zOTA2MjUgLjcxNzc3MzQ2IC40NTkzMDk5IC43MTc3NzM0NiAuNTE5NDQ5OSAuNzAyNDYzOCAuNTcxMDQ0OSAuNjcxODQ0NSAuNjIyNjM5OTggLjY0MTIyNTE4IC42NjIxMDk0IC41OTg1NTE0OCAuNjg5NDUzMSAuNTQzODIzMjcgLjcxNjc5NjkgLjQ4OTEwNTIzIC43MzA0Njg3NyAuNDI2MDc2MjcgLjczMDQ2ODc3IC4zNTQ3MzYzNCAuNzMwNDY4NzcgLjI4Mjc0NTM3IC43MTYxNDU4IC4yMTkzODU3OSAuNjg3NSAuMTY0NjU3NiAuNjU4ODU0MiAuMTA5OTM5NTc4IC42MTg4OTY1IC4wNjc4NDA1NzkgLjU2NzYyNjk4IC4wMzgzNjA1OTdNLjU3NDk1MTIgLjU1NzA1MjZDLjUyOTg2NjUgLjYwODg2MTI5IC40Njg0MjQ0OCAuNjM0NzY1NiAuMzkwNjI1IC42MzQ3NjU2IC4zMTI4MjU1NCAuNjM0NzY1NiAuMjUxMzgzNDYgLjYwODg2MTI5IC4yMDYyOTg4MyAuNTU3MDUyNiAuMTYxMjE0MTkgLjUwNTI1NDEgLjEzODY3MTg4IC40Mzc4MTUzNSAuMTM4NjcxODggLjM1NDczNjM0IC4xMzg2NzE4OCAuMjcwMzU1MjMgLjE2MTEzMjgxIC4yMDI5OTI3NSAuMjA2MDU0NjkgLjE1MjY0ODkzIC4yNTA5NzY1NyAuMTAyMzE1MjcgLjMxMjUgLjA3NzE0ODQ0IC4zOTA2MjUgLjA3NzE0ODQ0IC40Njg3NSAuMDc3MTQ4NDQgLjUzMDI3MzQ2IC4xMDIzMTUyNyAuNTc1MTk1MyAuMTUyNjQ4OTMgLjYyMDExNzIgLjIwMjk5Mjc1IC42NDI1NzgxIC4yNzAzNTUyMyAuNjQyNTc4MSAuMzU0NzM2MzQgLjY0MjU3ODEgLjQzNzgxNTM1IC42MjAwMzU4IC41MDUyNTQxIC41NzQ5NTEyIC41NTcwNTI2WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xNCIgZD0iTS4wNzMyNDIxOSAwVi43MDgwMDc4SC4xNjExMzI4MVYuMDgzMDA3ODFILjUxNzU3ODFWMEguMDczMjQyMTlaIi8+CiAgICA8cGF0aCBpZD0iZm9udF84XzE1IiBkPSJNLjM2MDM1MTU3IC4wNzcxNDg0NEMuMzkwNjI1IC4wNzcxNDg0NCAuNDE3MTU0OTUgLjA4MDQ4NTAyIC40Mzk5NDE0IC4wODcxNTgyIC40NjI3Mjc4OCAuMDkzODQxNTUgLjQ4MTI4MjU3IC4xMDI5NjYzMSAuNDk1NjA1NDggLjExNDUzMjQ3IC41MDk5Mjg0IC4xMjYwOTg2NCAuNTIxNDg0NCAuMTQwNTEzMSAuNTMwMjczNDYgLjE1Nzc3NTg4IC41MzkwNjI1IC4xNzUwMzg2NSAuNTQ1MTY2IC4xOTMxOTY2MSAuNTQ4NTg0IC4yMTIyNDk3NiAuNTUyMDAxOTggLjIzMTMxMzA3IC41NTM3MTA5NiAuMjUyNzM2NDMgLjU1MzcxMDk2IC4yNzY1MTk3OVYuNzA4MDA3OEguNjQxNjAxNTlWLjI3NjA3NzI4Qy42NDE2MDE1OSAuMDg4MTE5NTEgLjU0Nzg1MTU5LS4wMDU4NTkzNzUgLjM2MDM1MTU3LS4wMDU4NTkzNzUgLjE3MjUyNjA1LS4wMDU4NTkzNzUgLjA3ODYxMzI4IC4wODgxMTk1MSAuMDc4NjEzMjggLjI3NjA3NzI4Vi43MDgwMDc4SC4xNjY1MDM5Vi4yNzY1MTk3OUMuMTY2NTAzOSAuMjQ2MjI2IC4xNjk0MzM2IC4yMTk3NTcwOCAuMTc1MjkyOTcgLjE5NzExMzA0IC4xODExNTIzNSAuMTc0NDY5IC4xOTA5OTkzNSAuMTUzNzgzMTYgLjIwNDgzMzk5IC4xMzUwNTU1NCAuMjE4NjY4NjMgLjExNjMyNzkyIC4yMzg2MDY3NyAuMTAxOTk0ODM4IC4yNjQ2NDg0NSAuMDkyMDU2Mjc4IC4yOTA2OTAxIC4wODIxMTc3MTcgLjMyMjU5MTE3IC4wNzcxNDg0NCAuMzYwMzUxNTcgLjA3NzE0ODQ0WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xIiBkPSJNLjA3NDIxODc1IDBWLjcwODAwNzhILjE2MjEwOTM4TC40MTU1MjczNSAuMDY0OTQxNDA5IC42Njg5NDUzIC43MDgwMDc4SC43NTY4MzU5NlYwSC42Njg5NDUzVi40NjI5NjY5M0wuNDg2MzI4MTMgMEguMzQ0NzI2NTdMLjE2MjEwOTM4IC40NzA5NDcyOFYwSC4wNzQyMTg3NVoiLz4KICA8L2RlZnM+Cjx1c2UgZGF0YS10ZXh0PSJTIiB4bGluazpocmVmPSIjZm9udF84XzE2IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMTQuMzk0NTI5LDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJPIiB4bGluazpocmVmPSIjZm9udF84XzciIHRyYW5zZm9ybT0ibWF0cml4KDQ3Ljk3MDkyNiwwLDAsLTQ3Ljk3MDkyNiw5MS4yOTE5Miw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KICA8dXNlIGRhdGEtdGV4dD0iTCIgeGxpbms6aHJlZj0iI2ZvbnRfOF8xNCIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDE3My41MTQxLDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJVIiB4bGluazpocmVmPSIjZm9udF84XzE1IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMjQ1LjEzNDcsNjYuODU1NDEpIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHVzZSBkYXRhLXRleHQ9Ik0iIHhsaW5rOmhyZWY9IiNmb250XzhfMSIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDMyNC43MTg0OSw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+" alt="SOLUM" width="140" height="26" style="display:block;border:0;" />
    <p style="margin:10px 0 0;margin-left:4px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Your body. Done right.</p>
  </td></tr>

  <!-- Hero -->
  <tr><td style="background-color:#08090B;padding:48px 48px 0;">
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(224,92,92,0.1);border:1px solid rgba(224,92,92,0.35);padding:5px 14px;">
        <p style="margin:0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;font-weight:700;">Sold Out</p>
      </td></tr>
    </table>
    <h1 style="margin:0 0 16px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">
      You're<br />On The List.
    </h1>
    <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:24px;"></div>
    <p style="margin:0 0 32px;font-size:15px;color:rgba(240,236,226,0.7);line-height:1.75;max-width:440px;">
      ${greeting ? `${greeting}, we're` : `We're`} sorry you got this far and ran into a sold-out. The first batch went faster than expected. Your details are saved — you will hear from us the moment it's back in stock.
    </p>
  </td></tr>

  <!-- Founder note -->
  <tr><td style="background-color:#08090B;padding:0 48px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid #1e2530;border-left:2px solid #2E6DA4;">
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 4px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">From the Founder</p>
        <p style="margin:12px 0 16px;font-size:15px;color:rgba(240,236,226,0.85);line-height:1.75;font-style:italic;">
          "I'm genuinely sorry. You did everything right and we ran out. I built SOLUM because I believe in what it does — and running out of stock on people who want it is the worst feeling. I'm personally working on the restock. You will hear from me the moment it's ready."
        </p>
        <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.55);font-weight:600;">— Harsha &nbsp;·&nbsp; Founder, SOLUM</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- What happens next -->
  <tr><td style="background-color:#08090B;padding:0 48px 40px;">
    <p style="margin:0 0 20px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">What Happens Next</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e2530;">
      <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">1</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">You're saved. Nothing to do.</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">We've got your name and email. No form to fill in, no link to click. You're already on the list.</p>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">2</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">We restock. You're first.</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">When it's back in stock, we'll email you before anyone else. First access — no queue, no lottery.</p>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#181C24;padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;font-weight:700;color:#2E6DA4;line-height:1;">3</span>
          </td>
          <td>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#F0ECE2;">Follow for updates</p>
            <p style="margin:0;font-size:13px;color:rgba(240,236,226,0.5);line-height:1.6;">We post restock updates on Instagram as soon as they're confirmed. Follow <span style="color:#4A8FC7;font-weight:600;">@bysolum.body</span> to stay close.</p>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Instagram CTA -->
  <tr><td style="background-color:#08090B;padding:0 48px 48px;">
    <a href="https://instagram.com/bysolum.body" style="display:block;border:1px solid #1e2530;padding:16px 24px;text-decoration:none;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:16px;">
          <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);text-align:center;line-height:36px;font-size:18px;">📷</div>
        </td>
        <td style="vertical-align:middle;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#F0ECE2;letter-spacing:0.5px;">@bysolum.body</p>
          <p style="margin:2px 0 0;font-size:11px;color:rgba(240,236,226,0.45);letter-spacing:1px;">Follow for restock updates</p>
        </td>
      </tr></table>
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#08090B;border-top:1px solid #1e2530;padding:28px 48px 36px;">
    <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.35);line-height:1.7;">
      Questions? Email us at <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a>
    </p>
    <p style="margin:0;font-size:11px;color:rgba(240,236,226,0.2);letter-spacing:1px;">SOLUM &nbsp;·&nbsp; bysolum.co.uk &nbsp;·&nbsp; Your body. Done right.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, first_name, last_name, phone, line1, line2, city, postcode, source, utm_medium, utm_campaign, referred_by } = await req.json()

    const normalised = (email ?? '').trim().toLowerCase()

    if (!normalised || !isValidFormat(normalised)) {
      return json({ error: 'Please enter a valid email address.' }, 400)
    }

    const domain = normalised.split('@')[1]

    if (DISPOSABLE_DOMAINS.has(domain)) {
      return json({ error: 'Disposable email addresses are not accepted. Please use your real email.' }, 400)
    }

    const mxOk = await hasMxRecords(domain)
    if (!mxOk) {
      return json({ error: `The domain "${domain}" doesn't look right — double-check your email address.` }, 400)
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Duplicate check
    const { data: existing } = await db
      .from('leads')
      .select('id')
      .eq('email', normalised)
      .eq('checkout_status', 'waitlist')
      .maybeSingle()

    if (existing) {
      return json({ error: "You're already on the list — we'll email you at launch." }, 409)
    }

    // Insert — confirm_token is auto-generated by the DB default
    const { data: inserted, error: insertError } = await db
      .from('leads')
      .insert({
        email:           normalised,
        first_name:      first_name?.trim()  || null,
        last_name:       last_name?.trim()   || null,
        phone:           phone?.trim()       || null,
        line1:           line1?.trim()       || null,
        line2:           line2?.trim()       || null,
        city:            city?.trim()        || null,
        postcode:        postcode?.trim()    || null,
        checkout_status: 'waitlist',
        source:          source              || null,
        utm_medium:      utm_medium          || null,
        utm_campaign:    utm_campaign        || null,
        referred_by:     referred_by         || null,
      })
      .select('confirm_token')
      .single()

    if (insertError) throw insertError

    // Send waitlist email
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && inserted) {
      const subject = `You're on the list. We'll be in touch the moment it's back.`

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
            to: [normalised],
            subject,
            html: buildConfirmEmail(normalised, first_name?.trim() || null, inserted.confirm_token ?? '', 0),
          }),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('Resend error', res.status, body)
        }
      } catch (e) {
        console.error('Resend fetch error:', e)
      }
    }

    return json({ success: true })

  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
