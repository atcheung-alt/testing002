import { NextResponse } from "next/server";
import {
  isDriveConfigured,
  listAccessibleSharedDrives,
  findOrCreateFolder,
  upsertDriveFile,
} from "@/lib/googleDrive";
import { getEffectiveDriveFolderId } from "@/lib/appSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Visit this in a browser (or `curl`) to test Google Drive connectivity
 * directly, without going through the invoice/payment flow. Reports, in
 * order: whether credentials are set, which Shared Drives the service
 * account can actually see (compare this against the Drive folder ID
 * configured on the Settings page, or GOOGLE_DRIVE_ROOT_FOLDER_ID if that's
 * unset — a mismatch here is the most common setup mistake), then attempts to
 * create a test folder and upload a tiny PDF into it. Any failure returns
 * the exact step and the raw Google API error text.
 */
export async function GET() {
  const configured = isDriveConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        step: "config",
        ok: false,
        message:
          "GOOGLE_SERVICE_ACCOUNT_EMAIL and/or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not set in the server's environment.",
      },
      { status: 200 }
    );
  }

  const rootFolderId = await getEffectiveDriveFolderId();

  let sharedDrives: { id: string; name: string }[] = [];
  let sharedDrivesError: string | null = null;
  try {
    sharedDrives = await listAccessibleSharedDrives();
  } catch (err: any) {
    sharedDrivesError = err?.message || String(err);
  }

  const rootFolderMatchesAVisibleDrive =
    !!rootFolderId && sharedDrives.some((d) => d.id === rootFolderId);

  let folderId: string;
  try {
    folderId = await findOrCreateFolder("HR Plus — Drive Connection Test", rootFolderId);
  } catch (err: any) {
    const message: string = err?.message || String(err);
    const isNotFound = /"code":\s*404/.test(message) || /notFound/i.test(message);
    return NextResponse.json(
      {
        step: "folder",
        ok: false,
        rootFolderId,
        sharedDrivesVisibleToServiceAccount: sharedDrives,
        sharedDrivesError,
        message:
          isNotFound && rootFolderId && !rootFolderMatchesAVisibleDrive
            ? `${message}\n\nThe configured Drive folder ID ("${rootFolderId}", from the Settings page or GOOGLE_DRIVE_ROOT_FOLDER_ID) isn't one of the Shared Drives listed above that the service account can see. Either it's the wrong ID, or the service account hasn't actually been added as a Member of that Shared Drive yet (sharing a regular folder with it is not the same thing — it needs to be added on the Shared Drive's own "Manage members" screen). ${
                sharedDrives.length === 0
                  ? "Right now the service account isn't a member of ANY Shared Drive."
                  : `The service account currently sees: ${sharedDrives
                      .map((d) => `"${d.name}" (${d.id})`)
                      .join(", ")}.`
              }`
            : message,
      },
      { status: 200 }
    );
  }

  try {
    const file = await upsertDriveFile({
      name: "connection-test.pdf",
      folderId,
      // Minimal valid empty PDF — just enough to exercise a real upload.
      buffer: Buffer.from(
        "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>"
      ),
    });
    return NextResponse.json({
      step: "upload",
      ok: true,
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      fileUrl: file.webViewLink,
      rootFolderId,
      sharedDrivesVisibleToServiceAccount: sharedDrives,
      message:
        "Success — folder creation and file upload both worked. Check the folder/file links to confirm they're where you expect.",
    });
  } catch (err: any) {
    const message = err?.message || String(err);
    const isQuotaError = /storageQuotaExceeded/i.test(message);
    return NextResponse.json(
      {
        step: "upload",
        ok: false,
        folderId,
        rootFolderId,
        sharedDrivesVisibleToServiceAccount: sharedDrives,
        message: isQuotaError
          ? `${message}\n\nThis means the configured Drive folder points to a regular "My Drive" folder rather than a Shared Drive. Service accounts have no storage quota of their own — create a Shared Drive, add the service account as a Member, and point the Drive folder ID on the Settings page (or GOOGLE_DRIVE_ROOT_FOLDER_ID) at it instead.`
          : message,
      },
      { status: 200 }
    );
  }
}
