import React, { useEffect } from "react";
import { AppLauncher } from "../components/layout/AppLauncher";
import { useLayout } from "../context/LayoutContext";

export default function AppsPage() {
    const { openLauncher } = useLayout();

    useEffect(() => {
        openLauncher();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <AppLauncher />
        </div>
    );
}