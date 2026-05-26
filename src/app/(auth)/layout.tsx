export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,169,110,0.10) 0%, transparent 70%)",
      }}
    >
      {children}
    </div>
  );
}
