"use client";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
      <div className="ml-auto flex items-center gap-4">{children}</div>
    </header>
  );
}
