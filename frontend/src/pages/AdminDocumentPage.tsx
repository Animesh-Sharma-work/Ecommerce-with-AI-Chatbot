// src/pages/AdminDocumentPage.tsx

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} from "../features/api/apiSlice";
// import type { Document } from "../features/api/apiSlice"; // Import the new type
import { UploadCloud, FileText, Trash2 } from "lucide-react";

// A small component to render the status badges
// const StatusBadge = ({ status }: { status: Document["status"] }) => {
//   const statusStyles: { [key: string]: string } = {
//     COMPLETED: "bg-green-500 text-white",
//     PROCESSING: "bg-blue-500 text-white animate-pulse",
//     PENDING: "bg-yellow-500 text-black",
//     FAILED: "bg-red-500 text-white",
//   };
//   return (
//     <span
//       className={`px-2 py-1 text-xs font-semibold rounded-full ${
//         statusStyles[status] || "bg-gray-400"
//       }`}
//     >
//       {status}
//     </span>
//   );
// };

export function AdminDocumentPage() {
  const {
    data: paginatedResponse,
    isLoading,
    isError,
  } = useGetDocumentsQuery();
  const [uploadDocument, { isLoading: isUploading }] =
    useUploadDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploadError(null);
      if (acceptedFiles.length === 0) {
        return;
      }
      const file = acceptedFiles[0];
      try {
        await uploadDocument(file).unwrap();
      } catch (err) {
        console.error("Failed to upload document:", err);
        setUploadError("Upload failed. Please try again.");
      }
    },
    [uploadDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    }, // Only accept PDF, DOCX and TXT files
    multiple: false,
  });

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(id);
    }
  };

  // We now get the actual array of documents from the `.results` property.
  const documents = paginatedResponse?.results;

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg text-white">
      <h2 className="text-xl font-semibold mb-4">Manage Documents</h2>

      {/* --- File Upload Zone --- */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-green-400 bg-gray-600"
            : "border-gray-500 hover:border-green-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
          {isUploading ? (
            <p>Uploading...</p>
          ) : isDragActive ? (
            <p>Drop the file here ...</p>
          ) : (
            <p>Drag 'n' drop a file here, or click to select a file</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            PDF, DOCX, or TXT files are accepted
          </p>
        </div>
      </div>
      {uploadError && (
        <p className="text-sm text-red-400 mt-2">{uploadError}</p>
      )}

      {/* --- Document List --- */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-300">
            <thead className="bg-gray-800">
              <tr className="border-b border-gray-600">
                <th className="p-3">Filename</th>
                {/* <th className="p-3">Status</th> */}
                <th className="p-3">Uploaded At</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    Loading documents...
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-red-400">
                    Error loading documents.
                  </td>
                </tr>
              )}
              {documents?.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-gray-800 hover:bg-gray-600"
                >
                  <td className="p-3 flex items-center gap-2">
                    <FileText size={16} /> {doc.original_filename}
                  </td>
                  {/* <td className="p-3">
                    <StatusBadge status={doc.status} />
                  </td> */}
                  <td className="p-3">
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </td>
                  <td className="p-3">{doc.user_email}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-400 hover:text-red-300"
                      aria-label="Delete document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
