import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const fr = {
  app_name: "Madrasti",
  login: "Connexion",
  username: "Identifiant",
  password: "Mot de passe",
  sign_in: "Se connecter",
  logout: "Déconnexion",
  remember_hint: "Votre navigateur peut enregistrer le mot de passe.",
  // navigation
  nav_home: "Accueil",
  nav_students: "Élèves",
  nav_lessons: "Séances",
  nav_courses: "Cours",
  nav_homeworks: "Devoirs",
  nav_exams: "Contrôles",
  nav_feedback: "Messages",
  nav_account: "Compte",
  // niveaux / matières
  "1AC": "1ère année collège",
  "2AC": "2ème année collège",
  "3AC": "3ème année collège",
  math: "Mathématiques",
  physics: "Physique-Chimie",
  svt: "SVT",
  course: "Cours",
  exercise: "Exercices",
  correction: "Correction",
  // statuts
  pending: "À rendre",
  submitted: "Rendu",
  not_done: "Non fait",
  present: "Présent",
  absent: "Absent",
  // commun
  save: "Enregistrer",
  cancel: "Annuler",
  add: "Ajouter",
  delete: "Supprimer",
  confirm_delete: "Supprimer définitivement ?",
  open: "Ouvrir",
  back: "Retour",
  loading: "Chargement…",
  empty: "Rien pour le moment.",
  all_levels: "Tous les niveaux",
  level: "Niveau",
  subject: "Matière",
  date: "Date",
  slot: "Créneau",
  title: "Titre",
  description: "Description",
  notes: "Notes",
  file: "Fichier",
  files: "Fichiers",
  saved: "Enregistré ✓",
  child: "Enfant",
  // tableau de bord
  hello: "Bonjour",
  today: "Aujourd'hui",
  no_class_today: "Pas de séance aujourd'hui.",
  students_count: "élèves",
  upcoming_exams: "Contrôles à venir (14 jours)",
  open_homeworks: "Devoirs en cours",
  unread_feedback: "Messages non lus",
  absences: "Absences",
  homeworks_todo: "Devoirs à rendre",
  last_lesson: "Dernière séance",
  all_done: "Tout est rendu 👍",
  // élèves
  parents: "Parents",
  new_parent: "Nouveau parent",
  new_student: "Nouvel élève",
  full_name: "Nom complet",
  first_name: "Prénom",
  last_name: "Nom",
  phone: "Téléphone",
  parent: "Parent",
  no_parent: "— Sans parent —",
  student_login: "Compte élève (optionnel)",
  student_login_hint: "Obligatoire si l'élève n'a pas de parent dans l'app.",
  reset_password: "Nouveau mot de passe",
  deactivate: "Désactiver",
  reactivate: "Réactiver",
  inactive: "Inactif",
  children: "Enfants",
  // séances
  new_lesson: "Nouvelle séance",
  documents: "Documents",
  add_document: "Ajouter un document",
  attendance: "Appel",
  mark_all_present: "Tous présents",
  save_attendance: "Enregistrer l'appel",
  no_documents: "Aucun document.",
  // devoirs
  new_homework: "Nouveau devoir",
  due_date: "À rendre le",
  statement: "Énoncé (optionnel)",
  submissions: "Rendus",
  close_homework: "Marquer les non-rendus « Non fait »",
  publish_correction: "Publier la correction",
  correction_published: "Correction publiée",
  see_correction: "Voir la correction",
  see_statement: "Voir l'énoncé",
  send_photos: "Envoyer des photos",
  take_photo: "Prendre / choisir des photos",
  add_more: "Ajouter d'autres photos",
  sent_on: "Envoyé le",
  late: "En retard",
  // contrôles
  new_exam: "Ajouter un contrôle",
  exam_date: "Date du contrôle",
  grade: "Note",
  exam_copy: "Copie corrigée",
  upload_copy: "Ajouter la photo de la copie",
  past_exams: "Contrôles passés",
  upcoming: "À venir",
  all: "Tout",
  exams_hint: "Indiquez les dates des contrôles à l'école pour que le professeur prépare les révisions.",
  // feedback
  your_message: "Votre message",
  send: "Envoyer",
  reply: "Répondre",
  teacher_reply: "Réponse du professeur",
  about_child: "Concerne",
  general: "Général",
  mark_read: "Marquer comme lu",
  new_badge: "Nouveau",
  // compte
  language: "Langue",
  change_password: "Changer le mot de passe",
  current_password: "Mot de passe actuel",
  new_password: "Nouveau mot de passe",
  // erreurs
  err_invalid_credentials: "Identifiant ou mot de passe incorrect.",
  err_username_taken: "Cet identifiant est déjà utilisé.",
  err_parent_or_login_required: "Choisissez un parent ou créez un compte élève.",
  err_password_required: "Mot de passe requis pour le compte élève.",
  err_lesson_already_exists: "Une séance existe déjà pour ce niveau à ce créneau.",
  err_file_type_not_allowed: "Format non accepté (PDF, JPG, PNG, WEBP, HEIC).",
  err_file_too_large: "Fichier trop lourd (max 8 Mo).",
  err_too_many_files: "Trop de fichiers (max 6).",
  err_homework_closed: "La correction est publiée, envoi fermé.",
  err_wrong_password: "Mot de passe actuel incorrect.",
  err_invalid_input: "Vérifiez les champs du formulaire.",
  err_error: "Une erreur est survenue.",
};

type Key = keyof typeof fr;

const ar: Record<Key, string> = {
  app_name: "مدرستي",
  login: "تسجيل الدخول",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  sign_in: "دخول",
  logout: "خروج",
  remember_hint: "يمكن للمتصفح حفظ كلمة المرور.",
  nav_home: "الرئيسية",
  nav_students: "التلاميذ",
  nav_lessons: "الحصص",
  nav_courses: "الدروس",
  nav_homeworks: "الواجبات",
  nav_exams: "الفروض",
  nav_feedback: "الرسائل",
  nav_account: "الحساب",
  "1AC": "الأولى إعدادي",
  "2AC": "الثانية إعدادي",
  "3AC": "الثالثة إعدادي",
  math: "الرياضيات",
  physics: "الفيزياء والكيمياء",
  svt: "علوم الحياة والأرض",
  course: "الدرس",
  exercise: "التمارين",
  correction: "التصحيح",
  pending: "في الانتظار",
  submitted: "تم الإرسال",
  not_done: "لم يُنجز",
  present: "حاضر",
  absent: "غائب",
  save: "حفظ",
  cancel: "إلغاء",
  add: "إضافة",
  delete: "حذف",
  confirm_delete: "هل تريد الحذف نهائيًا؟",
  open: "فتح",
  back: "رجوع",
  loading: "جارٍ التحميل…",
  empty: "لا شيء حاليًا.",
  all_levels: "كل المستويات",
  level: "المستوى",
  subject: "المادة",
  date: "التاريخ",
  slot: "التوقيت",
  title: "العنوان",
  description: "الوصف",
  notes: "ملاحظات",
  file: "ملف",
  files: "الملفات",
  saved: "تم الحفظ ✓",
  child: "الابن/البنت",
  hello: "مرحبًا",
  today: "اليوم",
  no_class_today: "لا توجد حصة اليوم.",
  students_count: "تلاميذ",
  upcoming_exams: "الفروض القادمة (14 يومًا)",
  open_homeworks: "الواجبات الجارية",
  unread_feedback: "رسائل غير مقروءة",
  absences: "الغيابات",
  homeworks_todo: "واجبات يجب إرسالها",
  last_lesson: "آخر حصة",
  all_done: "تم إرسال كل شيء 👍",
  parents: "أولياء الأمور",
  new_parent: "ولي أمر جديد",
  new_student: "تلميذ جديد",
  full_name: "الاسم الكامل",
  first_name: "الاسم",
  last_name: "النسب",
  phone: "الهاتف",
  parent: "ولي الأمر",
  no_parent: "— بدون ولي أمر —",
  student_login: "حساب التلميذ (اختياري)",
  student_login_hint: "إجباري إذا لم يكن للتلميذ ولي أمر في التطبيق.",
  reset_password: "كلمة مرور جديدة",
  deactivate: "تعطيل",
  reactivate: "تفعيل",
  inactive: "معطّل",
  children: "الأبناء",
  new_lesson: "حصة جديدة",
  documents: "الوثائق",
  add_document: "إضافة وثيقة",
  attendance: "الحضور",
  mark_all_present: "الكل حاضر",
  save_attendance: "حفظ الحضور",
  no_documents: "لا توجد وثائق.",
  new_homework: "واجب جديد",
  due_date: "آخر أجل",
  statement: "نص الواجب (اختياري)",
  submissions: "الإرسالات",
  close_homework: "اعتبار غير المرسَل « لم يُنجز »",
  publish_correction: "نشر التصحيح",
  correction_published: "تم نشر التصحيح",
  see_correction: "عرض التصحيح",
  see_statement: "عرض النص",
  send_photos: "إرسال الصور",
  take_photo: "التقاط / اختيار صور",
  add_more: "إضافة صور أخرى",
  sent_on: "أُرسل في",
  late: "متأخر",
  new_exam: "إضافة فرض",
  exam_date: "تاريخ الفرض",
  grade: "النقطة",
  exam_copy: "الورقة المصححة",
  upload_copy: "إضافة صورة الورقة",
  past_exams: "الفروض السابقة",
  upcoming: "القادمة",
  all: "الكل",
  exams_hint: "أضيفوا تواريخ الفروض في المدرسة ليحضّر الأستاذ المراجعة.",
  your_message: "رسالتك",
  send: "إرسال",
  reply: "رد",
  teacher_reply: "رد الأستاذ",
  about_child: "بخصوص",
  general: "عام",
  mark_read: "تعليم كمقروء",
  new_badge: "جديد",
  language: "اللغة",
  change_password: "تغيير كلمة المرور",
  current_password: "كلمة المرور الحالية",
  new_password: "كلمة المرور الجديدة",
  err_invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة.",
  err_username_taken: "اسم المستخدم مستعمل.",
  err_parent_or_login_required: "اختر ولي أمر أو أنشئ حسابًا للتلميذ.",
  err_password_required: "كلمة المرور مطلوبة لحساب التلميذ.",
  err_lesson_already_exists: "توجد حصة لهذا المستوى في هذا التوقيت.",
  err_file_type_not_allowed: "صيغة غير مقبولة (PDF, JPG, PNG, WEBP, HEIC).",
  err_file_too_large: "الملف كبير جدًا (8 ميغا كحد أقصى).",
  err_too_many_files: "عدد الملفات كبير (6 كحد أقصى).",
  err_homework_closed: "تم نشر التصحيح، الإرسال مغلق.",
  err_wrong_password: "كلمة المرور الحالية غير صحيحة.",
  err_invalid_input: "تحقق من الحقول.",
  err_error: "حدث خطأ.",
};

export type Lang = "fr" | "ar";
const dicts: Record<Lang, Record<Key, string>> = { fr, ar };
const LANG_KEY = "madrasti_lang";

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key | string) => string;
  err: (e: unknown) => string;
  fmtDate: (iso: string) => string;
}

const Ctx = createContext<I18n>(null!);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "fr" || saved === "ar") return saved;
  } catch {
    /* ignore */
  }
  return "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = dicts[lang].app_name;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback((k: string) => dicts[lang][k as Key] ?? k, [lang]);
  const err = useCallback(
    (e: unknown) => {
      const code = e instanceof Error ? e.message : "error";
      return dicts[lang][`err_${code}` as Key] ?? dicts[lang].err_error;
    },
    [lang],
  );
  const fmtDate = useCallback(
    (iso: string) =>
      new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(
        lang === "ar" ? "ar-MA" : "fr-MA",
        { weekday: "short", day: "numeric", month: "short" },
      ),
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang: setLangState, t, err, fmtDate }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
