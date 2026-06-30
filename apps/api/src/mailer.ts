import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "./env";

/**
 * Transactional email via Amazon SES (SESv2). Uses its OWN credentials/region,
 * kept separate from the S3/R2 vars (those point at Cloudflare/MinIO with
 * AWS_REGION=auto, which SES would reject). Falls back to the default AWS
 * credential chain when the SES_* vars aren't set.
 */
const region = env.AWS_SES_REGION ?? env.SES_REGION ?? "us-east-1";
const accessKeyId = env.AWS_SES_ACCESS_KEY_ID ?? env.SES_ACCESS_KEY_ID;
const secretAccessKey = env.AWS_SES_ACCESS_KEY ?? env.SES_SECRET_ACCESS_KEY;

const ses = new SESv2Client({
  region,
  ...(accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {}),
});

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** True when SES is configured enough to actually send (a verified From). */
export const emailEnabled = Boolean(env.EMAIL_FROM);

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const from = env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set — cannot send email.");

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      },
    }),
  );
}
