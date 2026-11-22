"use client";

import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import store from "@/store";
import { DemoActionProvider } from "@/components/layout/demoActions";
import CustomProviders from "@/lib/providers/custom";

export default function Providers({ children, demoMode, session }) {
  return (
    <SessionProvider key={session?.user?.appUserId ?? "anonymous"} session={session}>
      <ReduxProvider store={store}>
        <DemoActionProvider demoMode={demoMode}>
          <CustomProviders>{children}</CustomProviders>
        </DemoActionProvider>
      </ReduxProvider>
    </SessionProvider>
  );
}
