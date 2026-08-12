import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

export type EmailComposeFieldsHandle = {
  getValues: () => { subject: string; text: string };
  reset: () => void;
};

type EmailComposeFieldsProps = {
  autoFocusSubject?: boolean;
  messageId?: string;
  messageMinHeightClass?: string;
  ref?: Ref<EmailComposeFieldsHandle>;
  subjectId?: string;
};

const fieldLabelClass = 'text-sm font-medium text-foreground';
const inputClass
  = 'input input--primary input--full-width min-h-10 text-base';
const textareaClass
  = 'textarea textarea--primary textarea--full-width min-h-28 text-base';

export function EmailComposeFields({
  autoFocusSubject = false,
  messageId = 'email-message',
  messageMinHeightClass = 'min-h-28',
  ref,
  subjectId = 'email-subject',
}: EmailComposeFieldsProps) {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => ({ subject, text }),
      reset: () => {
        setSubject('');
        setText('');
      },
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
        <label className={fieldLabelClass} htmlFor={subjectId}>
          Subject
        </label>
        <input
          autoComplete='off'
          className={inputClass}
          id={subjectId}
          name='subject'
          onChange={event => setSubject(event.target.value)}
          required
          type='text'
          value={subject}
        />
      </div>

      <div className='grid gap-1.5'>
        <label className={fieldLabelClass} htmlFor={messageId}>
          Message
        </label>
        <textarea
          className={`${textareaClass} ${messageMinHeightClass}`}
          id={messageId}
          name='message'
          onChange={event => setText(event.target.value)}
          required
          value={text}
        />
      </div>
    </>
  );
}
