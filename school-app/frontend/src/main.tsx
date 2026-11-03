import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./index.css";
import { AuthProvider, useAuth } from "./auth";
import { I18nProvider } from "./i18n";
import Layout from "./Layout";
import Account from "./pages/Account";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminExams from "./pages/admin/Exams";
import AdminFeedback from "./pages/admin/Feedback";
import AdminHomeworkDetail from "./pages/admin/HomeworkDetail";
import AdminHomeworks from "./pages/admin/Homeworks";
import AdminLessonDetail from "./pages/admin/LessonDetail";
import AdminLessons from "./pages/admin/Lessons";
import Students from "./pages/admin/Students";
import FamilyDashboard from "./pages/family/Dashboard";
import FamilyExams from "./pages/family/Exams";
import FamilyFeedback from "./pages/family/Feedback";
import FamilyHomeworks from "./pages/family/Homeworks";
import FamilyLessons from "./pages/family/Lessons";
import Login from "./pages/Login";

function AppRoutes() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Login />;

  const admin = user.role === "admin";
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={admin ? <AdminDashboard /> : <FamilyDashboard />} />
        <Route path="lessons" element={admin ? <AdminLessons /> : <FamilyLessons />} />
        <Route path="homeworks" element={admin ? <AdminHomeworks /> : <FamilyHomeworks />} />
        <Route path="exams" element={admin ? <AdminExams /> : <FamilyExams />} />
        <Route path="feedback" element={admin ? <AdminFeedback /> : <FamilyFeedback />} />
        <Route path="account" element={<Account />} />
        {admin && (
          <>
            <Route path="students" element={<Students />} />
            <Route path="lessons/:id" element={<AdminLessonDetail />} />
            <Route path="homeworks/:id" element={<AdminHomeworkDetail />} />
          </>
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
