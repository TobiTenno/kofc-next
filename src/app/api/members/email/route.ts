import { inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema';
import { recordAuditEvent } from '@/lib/audit';
import { sendCouncilBroadcast, sendEmail } from '@/lib/mailgun';
import { canSendRosterEmail } from '@/lib/officers';
import { getMembershipNumber } from '@/lib/session';

export const POST = async (request: Request): Promise<NextResponse> => {
  const membershipNumber = await getMembershipNumber();
  if (!membershipNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canSendRosterEmail(membershipNumber))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    subject?: string;
    text?: string;
    membershipNumber?: string;
    membershipNumbers?: string[];
  };

  if (!body.subject || !body.text) {
    return NextResponse.json(
      { error: 'Missing subject or text' },
      { status: 400 },
    );
  }

  const html = `<p>${body.text.replaceAll('\n', '<br />')}</p>`;

  const membershipNumbers = body.membershipNumbers?.length
    ? [...new Set(body.membershipNumbers)]
    : body.membershipNumber
      ? [body.membershipNumber]
      : null;

  const auditEmailSend = async (recipientCount: number): Promise<void> => {
    await recordAuditEvent({
      actorMembershipNumber: membershipNumber,
      action: 'email.send',
      summary: `Sent email to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`,
      metadata: {
        recipientCount,
        subjectLength: body.subject?.length ?? 0,
        targeted: Boolean(membershipNumbers),
      },
    });
  };

  if (membershipNumbers) {
    const matched = await db
      .select()
      .from(members)
      .where(inArray(members.membershipNumber, membershipNumbers));

    if (matched.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const recipients = matched
      .map((member) => member.primaryEmail)
      .filter((email): email is string => Boolean(email));

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Selected members have no primary email on file' },
        { status: 400 },
      );
    }

    if (recipients.length === 1) {
      const recipient = recipients[0];
      if (!recipient) {
        return NextResponse.json({ error: 'No recipients' }, { status: 400 });
      }

      await sendEmail({
        to: recipient,
        subject: body.subject,
        text: body.text,
        html,
      });

      await auditEmailSend(1);
      return NextResponse.json({
        ok: true,
        recipientCount: 1,
        recipientEmail: recipients[0],
        skippedCount: matched.length - recipients.length,
      });
    }

    await sendCouncilBroadcast({
      recipients,
      subject: body.subject,
      text: body.text,
      html,
    });

    await auditEmailSend(recipients.length);
    return NextResponse.json({
      ok: true,
      recipientCount: recipients.length,
      skippedCount: matched.length - recipients.length,
    });
  }

  const roster = await db.select().from(members);
  const recipients = roster
    .filter((member) => member.active && member.primaryEmail)
    .map((member) => member.primaryEmail as string);

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients' }, { status: 400 });
  }

  await sendCouncilBroadcast({
    recipients,
    subject: body.subject,
    text: body.text,
    html,
  });

  await auditEmailSend(recipients.length);
  return NextResponse.json({ ok: true, recipientCount: recipients.length });
};
