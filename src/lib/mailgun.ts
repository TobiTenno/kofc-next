const sendMailgunRequest = async (
  fields: Record<string, string>,
): Promise<void> => {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    throw new Error('Mailgun is not configured');
  }

  const body = new URLSearchParams(fields);
  const response = await fetch(
    `https://api.mailgun.net/v3/${domain}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Mailgun request failed: ${response.status}`);
  }
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> => {
  const from = process.env.MAILGUN_FROM;
  if (!from) {
    throw new Error('Mailgun is not configured');
  }

  await sendMailgunRequest({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
  });
};

export const sendRegistrationCode = async (options: {
  to: string;
  code: string;
}): Promise<void> => {
  await sendEmail({
    to: options.to,
    subject: 'Council member registration code',
    text: `Your verification code is ${options.code}. It expires in 15 minutes.`,
    html: `<p>Your verification code is <strong>${options.code}</strong>.</p><p>It expires in 15 minutes.</p>`,
  });
};

export const sendCouncilBroadcast = async (options: {
  recipients: string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<void> => {
  const from = process.env.MAILGUN_FROM;
  if (!from) {
    throw new Error('Mailgun is not configured');
  }

  const chunkSize = 50;
  for (let index = 0; index < options.recipients.length; index += chunkSize) {
    const chunk = options.recipients.slice(index, index + chunkSize);
    await sendMailgunRequest({
      from,
      to: chunk.join(','),
      subject: options.subject,
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
    });
  }
};
