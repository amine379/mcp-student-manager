import FamilyDocuments from "../../components/FamilyDocuments";
import { useI18n } from "../../i18n";
import { PageTitle } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

export default function FamilyDocumentsPage() {
  const { t } = useI18n();
  const kids = useChildren();

  return (
    <div className="space-y-4">
      <PageTitle hint={t("family_doc_hint")}>{t("my_documents")}</PageTitle>
      <ChildPicker {...kids} />
      <FamilyDocuments child={kids.selected} />
    </div>
  );
}
