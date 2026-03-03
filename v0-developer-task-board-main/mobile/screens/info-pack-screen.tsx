import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const SECTIONS: Array<{ title: string; points: string[] }> = [
  {
    title: "Board Basics",
    points: [
      "Tasks are grouped by status columns: Backlog, Todo, In Progress, In Review, and Done.",
      "Priority is shown as a colored left border on each card.",
      "Use the priority legend at the top of the board to quickly read color meaning.",
    ],
  },
  {
    title: "Task Actions",
    points: [
      "Create tasks from the New Task button or from a specific column.",
      "Open a card to view full details, comments, and GitHub links.",
      "Edit task title, description, type, labels, assignee, status, and priority.",
      "Delete actions use a warning confirmation modal before removal.",
    ],
  },
  {
    title: "Workflow",
    points: [
      "Drag and drop cards between columns to update status.",
      "Card ordering and status updates are saved to the backend.",
      "Done cards are visually marked and separated from active work.",
    ],
  },
  {
    title: "Search & Filters",
    points: [
      "Search by task title, description, task key, and labels.",
      "Filter by priority and type from the board header controls.",
      "Use Clear to reset all filters quickly.",
    ],
  },
  {
    title: "Comments & Collaboration",
    points: [
      "Comments can be posted inside task details for discussion and handover.",
      "Comment counters are shown directly on cards when comments exist.",
      "Team members invited via Profile -> Invite Team Members can work on the same board.",
    ],
  },
  {
    title: "GitHub Integration",
    points: [
      "Save encrypted GitHub token and project mappings in Profile settings.",
      "Create GitHub issues and branches directly from task details.",
      "Issue numbers and branch names appear on the task card for quick context.",
    ],
  },
  {
    title: "Reports & Intake",
    points: [
      "Use Reports to capture incoming work requests before adding to the board.",
      "Reports can be reviewed and promoted into tasks for execution.",
      "Report states help track review progress separately from delivery status.",
    ],
  },
  {
    title: "Profile & Compliance",
    points: [
      "Maintain user, company, and contact details in Profile.",
      "Manage team invite emails used for shared board access.",
      "Disclaimer and POPIA acknowledgements are stored in profile settings.",
    ],
  },
];

export function InfoPackScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Task Board Info Pack</Text>
        <Text style={styles.subtitle}>
          Quick reference for board functionality and team workflow.
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.tipCard}>
        <Text style={styles.sectionTitle}>Team Tip</Text>
        <Text style={styles.pointText}>
          Keep Invite Team Members updated with valid email addresses so teammates can
          access the same board context.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 12,
    gap: 10,
    paddingBottom: 24,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#111827",
    padding: 12,
    gap: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    backgroundColor: "#111827",
    padding: 12,
    gap: 7,
  },
  tipCard: {
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    backgroundColor: "#0b1220",
    padding: 12,
    gap: 7,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12,
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bullet: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  pointText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
});
