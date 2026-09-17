import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";

const SuccessScreen = ({
  icon: Icon = CheckCircle2,
  title,
  message,
  note,
  buttonLabel = "Back to Login",
  buttonHref = "/",
}) => (
  <div className="animate-in fade-in zoom-in duration-300 w-full rounded-3xl border border-[#e8ecf1] dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-10 md:px-10 shadow-[0_16px_40px_-16px_rgba(51,105,30,0.18)]">
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full bg-emerald-200/40 blur-lg" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 ring-8 ring-emerald-50">
          <Icon className="h-10 w-10 text-emerald-500" />
        </div>
      </div>

      <h1 className="mb-3 text-3xl font-bold text-[#3c3c3c]">{title}</h1>

      <p className="mb-2 leading-6 text-[#3c3c3c]">{message}</p>

      {note && <p className="mb-9 text-sm leading-6 text-gray-500">{note}</p>}

      <Link
        href={buttonHref}
        className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-gradient-to-r from-[#8bc34a] to-[#33691e] px-10 py-3 font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
      >
        {buttonLabel}
      </Link>
    </div>
  </div>
);

export default SuccessScreen;