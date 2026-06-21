export default function ThankYouPage() {
  return (
    <section className='w-full max-w-lg mx-auto grid gap-4 text-center'>
      <h1 className='text-2xl font-bold'>Thank you</h1>
      <p>
        Your PayPal payment was submitted. The Financial Secretary will record
        it once confirmed.
      </p>
      <a href='/' className='underline'>
        Return home
      </a>
    </section>
  );
}
