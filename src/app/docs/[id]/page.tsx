import { notFound, redirect } from "next/navigation";

import AppHeader from "@/components/AppHeader";
import DocumentEditor from "@/components/DocumentEditor";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccess, listShares } from "@/lib/documents";
import { PUBLIC_USER_SELECT } from "@/lib/dto";
import type { OwnerView, ShareView } from "@/lib/types";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/docs/${id}`)}`);
  }

  const access = await getAccess(user.id, id);
  // Missing document and missing permission are indistinguishable on purpose.
  if (!access) notFound();

  const document = await db.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      owner: { select: { id: true, name: true } },
    },
  });

  if (!document) notFound();

  // Collaborator emails and their roles are owner-only data.
  let owner: OwnerView = document.owner;
  let shares: ShareView[] = [];

  if (access === "OWNER") {
    const [account, collaborators] = await Promise.all([
      db.user.findUnique({ where: { id: document.owner.id }, select: PUBLIC_USER_SELECT }),
      listShares(document.id),
    ]);
    if (account) owner = { id: account.id, name: account.name, email: account.email };
    shares = collaborators;
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <DocumentEditor
        documentId={document.id}
        initialTitle={document.title}
        initialContent={document.content}
        initialUpdatedAt={document.updatedAt.toISOString()}
        access={access}
        owner={owner}
        initialShares={shares}
      />
    </div>
  );
}
