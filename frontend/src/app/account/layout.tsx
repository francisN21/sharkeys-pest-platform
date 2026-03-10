import type { ReactNode } from "react";
import AccountShellClient from "./_components/AccountShellClient";

export default function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AccountShellClient>{children}</AccountShellClient>;
}