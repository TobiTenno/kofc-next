import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export type EmailComposeFieldsHandle = {
  reset: () => void;
  getValues: () => { subject: string; text: string };
};

type EmailComposeFieldsProps = {
  subjectId?: string;
  messageId?: string;
  messageMinHeightClass?: string;
  autoFocusSubject?: boolean;
};

const fieldLabelClass = 'text-sm font-medium text-foreground';
const inputClass =
  'input input--primary input--full-width min-h-10 text-foreground';
const textareaClass =
  'textarea textarea--primary textarea--full-width min-h-28 text-foreground';

export const EmailComposeFields = forwardRef<
  EmailComposeFieldsHandle,
  EmailComposeFieldsProps
>(function EmailComposeFields(
  {
    subjectId = 'email-subject',
    messageId = 'email-message',
    messageMinHeightClass = 'min-h-28',
    autoFocusSubject = false,
  },
  ref,
) {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        setSubject('');
        setText('');
      },
      getValues: () => ({ subject, text }),
    }),
    [subject, text],
  );

  useEffect(() => {
    if (!autoFocusSubject) {
      return;
    }

    const element = document.getElementById(subjectId);
    element?.focus();
  }, [autoFocusSubject, subjectId]);

  return (
    <>
      <div className='grid gap-1.5'>
        <label htmlFor={subjectId} className={fieldLabelClass}>
          Subject
        </label>
        <input
          id={subjectId}
          name='subject'
          type='text'
          required
          autoComplete='off'
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className='grid gap-1.5'>
        <label htmlFor={messageId} className={fieldLabelClass}>
          Message
        </label>
        <textarea
          id={messageId}
          name='message'
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={`${textareaClass} ${messageMinHeightClass}`}
        />
      </div>
    </>
  );
});
