"use client";

import { useState } from "react";
import { AuthProvider } from "@/lib/auth-provider";
import { KanbanBoard } from "@/components/kanban-board";
import { ReportsList } from "@/components/reports-list";
import { ProfileSection } from "@/components/profile-section";
import { TaskBoardInfo } from "@/components/task-board-info";
import { cn } from "@/lib/utils";
import { LayoutGrid, FileText, User, Info } from "lucide-react";

type ActiveTab = "board" | "reports" | "profile" | "info";

function BoardContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("board");

  return (
    <div className="flex h-screen flex-col bg-background/50">
      {/* Tab Navigation */}
      <div className="glass-panel flex-shrink-0 rounded-none border-x-0 border-t-0 px-4">
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button
            onClick={() => setActiveTab("board")}
            className={cn(
              "flex items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-all",
              activeTab === "board"
                ? "glass-panel-soft border-primary/30 text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-all",
              activeTab === "reports"
                ? "glass-panel-soft border-primary/30 text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            Reports
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-all",
              activeTab === "profile"
                ? "glass-panel-soft border-primary/30 text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-all",
              activeTab === "info"
                ? "glass-panel-soft border-primary/30 text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <Info className="h-4 w-4" />
            Info Pack
          </button>
        </nav>
      </div>

      {/* Active Content */}
      <div className="min-h-0 flex-1">
        {activeTab === "board" && <KanbanBoard />}
        {activeTab === "reports" && <ReportsList />}
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "info" && <TaskBoardInfo />}
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <AuthProvider>
      <BoardContent />
    </AuthProvider>
  );
}
