import type { ReactNode } from "react";
import AccountShellClient from "./_components/AccountShellClient";
import { PageContainer } from "../../components/ui/page-container"

export default function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AccountShellClient><PageContainer>{children}</PageContainer></AccountShellClient>
  
  ;
}