import F2HomeLogo from "../../components/ui/F2HomeLogo";

const AuthLayout = ({ children }) => (
  <div className="fixed inset-0 z-[50] min-h-screen bg-[#f7faf3] flex overflow-hidden">
    {/* Left brand panel - F2Home green farm theme */}
    <div className="hidden md:flex relative w-1/2 items-center justify-center overflow-hidden">
      <div className="absolute -left-[45%] -top-[58%] h-[155%] w-[145%] rounded-full bg-gradient-to-br from-[#f2f8ea] via-[#d9eebf] to-[#8bc34a]" />
      <div className="relative z-10 flex flex-col items-center w-[540px] max-w-full px-6">
        <F2HomeLogo className="w-full h-auto" />
        <p className="mt-6 text-2xl italic font-serif text-[#2e7d32] text-center">
          Bringing Nature Closer to You
        </p>
      </div>
    </div>

    <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="md:hidden flex justify-center mb-8">
          <div className="w-44">
            <F2HomeLogo className="w-full h-auto" showTagline={false} />
          </div>
        </div>
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
