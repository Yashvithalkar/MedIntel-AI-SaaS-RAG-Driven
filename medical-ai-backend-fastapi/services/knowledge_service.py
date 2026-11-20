import io
from fastapi import HTTPException, status
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.pdf_cleaner import clean_pdf_text  # Assumes your Python pdfCleaner utility
from services.vector_service import embed_and_upsert_chunks

class KnowledgeService:
    """
    Handles PDF document ingestion, text extraction, cleaning, 
    token-optimized chunking, and syncing with the vector database.
    """

    async def ingest_pdf_documents(self, documents: list, current_user: dict):
        """
        Complete Ingestion Pipeline: Upload, extract, chunk, embed, and store in vector database.
        """
        if not documents or len(documents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select at least one medical PDF file to ingest."
            )

        if len(documents) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot upload more than 5 documents at a time."
            )

        all_chunks = []
        files_processed = []

        # Initialize LangChain's RecursiveCharacterTextSplitter
        # chunkSize: 1500 characters (~512 tokens)
        # chunkOverlap: 150 characters (~50 tokens) to maintain context continuity
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=150
        )

        for file in documents:
            # Validate file type
            if not file.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{file.filename}' is not a valid PDF document."
                )

            try:
                # Read uploaded file content into memory buffer
                file_bytes = await file.read()
                pdf_file_like = io.BytesIO(file_bytes)

                # Step 1: Extract raw content using pypdf
                reader = PdfReader(pdf_file_like)
                total_pages = len(reader.pages)
                
                raw_text = ""
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        raw_text += extracted + "\n"

                # Step 2: Clean noise (page numbers, weird spacing, headers)
                cleaned_text = clean_pdf_text(raw_text)

                if not cleaned_text or len(cleaned_text.strip()) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Failed to extract readable text from {file.filename}"
                    )

                # Step 3: Split text into chunks using LangChain text splitter
                doc_chunks = text_splitter.create_documents(
                    texts=[cleaned_text],
                    metadatas=[{"source": file.filename, "totalPages": total_pages}]
                )

                # Step 4: Map chunks into standardized structure for embedding/Pinecone
                for index, chunk in enumerate(doc_chunks):
                    all_chunks.append({
                        "chunkIndex": index,
                        "pageContent": chunk.page_content,
                        "metadata": {
                            "source": chunk.metadata.get("source"),
                            "totalPages": chunk.metadata.get("totalPages"),
                            "chunkLength": len(chunk.page_content),
                        },
                    })

                files_processed.append(file.filename)

            except Exception as error:
                print(f"❌ Error processing PDF file ({file.filename}): {str(error)}")
                if isinstance(error, HTTPException):
                    raise error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error processing PDF file ({file.filename}): {str(error)}"
                )

        # Step 5: Generate Gemini embeddings & upsert vectors to Pinecone
        try:
            vector_result = await embed_and_upsert_chunks(all_chunks)
        except Exception as error:
            print(f"❌ Vector embedding and upsert failed: {str(error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to sync chunks to vector database: {str(error)}"
            )

        return {
            "success": True,
            "message": "Medical document successfully processed, embedded via Gemini, and synced to Pinecone.",
            "details": {
                "filesProcessed": files_processed,
                "totalChunksGenerated": len(all_chunks),
                **vector_result,
            },
        }

knowledge_service = KnowledgeService()