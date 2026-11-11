import { Link } from "react-router-dom";

import FamilyDocuments from "../../components/FamilyDocuments";
import { useI18n } from "../../i18n";
import { PageTitle } from "../../ui";

export default function AdminDocuments() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm font-semibold text-ink">← {t("back")}</Link>
      <PageTitle hint={t("hint_documents_admin")}>{t("family_documents")}</PageTitle>
      <FamilyDocuments />
    </div>
  );
}
