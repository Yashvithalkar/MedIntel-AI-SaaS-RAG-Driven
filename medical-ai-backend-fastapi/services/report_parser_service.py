
import os
import base64
import io
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from pypdf import PdfReader

from utils.pdf_cleaner import clean_pdf_text

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key) if api_key else None


async def extract_report_content(file) -> str | dict | None:
    """
    Extract clinical text and findings from uploaded patient reports.

    Supported formats:
    - PDF: Extracts text using pypdf.
    - JPG/JPEG/PNG: Uses Gemini to analyze medical report images.

    Returns:
        Extracted text, or None if no file is provided.
    """
    if not file:
        return None

    filename = file.filename or ""
    ext = Path(filename).suffix.lower()

    try:
        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded report file is empty.",
            )

        # Extract text from PDF reports.
        if ext == ".pdf":
            pdf_file_like = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file_like)

            raw_text = ""

            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    raw_text += extracted + "\n"

            cleaned = clean_pdf_text(raw_text)

            return cleaned or "No readable text found in PDF report."

        # Analyze image-based medical reports.
        elif ext in {".jpg", ".jpeg", ".png"}:
            if client is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="GEMINI_API_KEY is not configured.",
                )

            mime_type = file.content_type or {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
            }[ext]

            prompt_text = (
                "Analyze this medical report image. Extract visible clinical "
                "findings, numerical values, laboratory measurements, "
                "abnormalities, and diagnostic descriptions concisely. "
                "Preserve units and reference ranges when visible. "
                "Do not invent missing values or make unsupported diagnoses. "
                "Clearly mention any text that is unreadable."
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=mime_type,
                    ),
                    prompt_text,
                ],
            )

            return (
                response.text
                or "No distinct clinical findings extracted from image."
            )

        # Reject unsupported formats.
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Upload a PDF, JPG, JPEG, or PNG.",
            )

    except HTTPException:
        raise

    except Exception as error:
        print(f"Report parsing error: {error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse uploaded medical report.",
        )


class ReportParserService:
    """Compatibility wrapper for callers using the service instance."""

    async def extract_report_content(self, file) -> str | dict | None:
        return await extract_report_content(file)


report_parser_service = ReportParserService()
