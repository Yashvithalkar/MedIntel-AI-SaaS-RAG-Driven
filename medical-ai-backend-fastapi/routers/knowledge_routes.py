from fastapi import APIRouter, Depends, File, UploadFile, status, HTTPException
from typing import List
from dependencies.auth import verify_access_token
from dependencies.rbac import require_role
from services import knowledge_service

router = APIRouter()

@router.post("/ingest-pdf", status_code=status.HTTP_201_CREATED)
async def ingest_medical_pdf(
    # FastAPI equivalent of multer upload.array("documents", 5)
    documents: List[UploadFile] = File(..., description="Array of PDF documents to ingest (max 5)"),
    current_user = Depends(verify_access_token),
    _=Depends(require_role("admin", "doctor"))
):
    """
    POST /api/knowledge/ingest-pdf
    Ingest multiple medical PDF documents into the knowledge base / vector database.
    Protected by Auth and RBAC (admin or doctor).
    """
    # Validate maximum file count (replaces uploadDocumentValidator array length check)
    if len(documents) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload more than 5 documents at a time."
        )

    # Optional file type validation (ensure they are PDFs)
    for doc in documents:
        if doc.content_type != "application/pdf" and not doc.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{doc.filename}' is not a valid PDF document."
            )

    return await knowledge_service.ingest_pdf_documents(documents=documents, current_user=current_user)