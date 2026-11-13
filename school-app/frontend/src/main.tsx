import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./index.css";
import { AuthProvider, useAuth } from "./auth";
import { I18nProvider, useI18n } from "./i18n";
import Layout from "./Layout";
import Account from "./pages/Account";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminDocuments from "./pages/admin/Documents";
import AdminSchedule from "./pages/admin/Schedule";
import AdminExamPrep from "./pages/admin/ExamPrep";
import AdminExams from "./pages/admin/Exams";
import AdminHomeworkDetail from "./pages/admin/HomeworkDetail";
import AdminHomeworks from "./pages/admin/Homeworks";
import AdminLessonDetail from "./pages/admin/LessonDetail";
import AdminLessons from "./pages/admin/Lessons";
import AdminMessages from "./pages/admin/Messages";
import Students from "./pages/admin/Students";
import FamilyDashboard from "./pages/family/Dashboard";
import FamilyDocuments from "./pages/family/Documents";
import FamilyExamPrep from "./pages/family/ExamPrep";
import FamilyExams from "./pages/family/Exams";
import FamilyHomeworks from "./pages/family/Homeworks";
import FamilyLessons from "./pages/family/Lessons";
import FamilyMessages from "./pages/family/Messages";
import Login from "./pages/Login";

function Offline() {
  const { retry, logout } = useAuth();
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <img src="/icon.svg" alt="" className="h-16 w-16 opacity-80" />
      <p className="text-slate-600">{t("offline")}</p>
      <div className="flex gap-2">
        <button className="btn" onClick={retry}>{t("retry")}</button>
        <button className="btn-light" onClick={logout}>{t("logout")}</button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, ready, offline } = useAuth();
  if (!ready) return null;
  if (offline) return <Offline />;
  if (!user) return <Login />;

  const admin = user.role === "admin";
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={admin ? <AdminDashboard /> : <FamilyDashboard />} />
        <Route path="lessons" element={admin ? <AdminLessons /> : <FamilyLessons />} />
        <Route path="homeworks" element={admin ? <AdminHomeworks /> : <FamilyHomeworks />} />
        <Route path="exams" element={admin ? <AdminExams /> : <FamilyExams />} />
        <Route path="exam-prep" element={admin ? <AdminExamPrep /> : <FamilyExamPrep />} />
        <Route path="messages" element={admin ? <AdminMessages /> : <FamilyMessages />} />
        <Route path="account" element={<Account />} />
        {admin ? (
          <>
            <Route path="students" element={<Students />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="messages/:id" element={<AdminMessages />} />
            <Route path="lessons/:id" element={<AdminLessonDetail />} />
            <Route path="homeworks/:id" element={<AdminHomeworkDetail />} />
          </>
        ) : (
          <Route path="documents" element={<FamilyDocuments />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
