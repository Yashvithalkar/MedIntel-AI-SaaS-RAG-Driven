
import os
import uuid
import asyncio
import traceback

from google import genai
from google.genai import types
from fastapi import HTTPException, status
from pinecone import Pinecone


# ============================================================
# CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

PINECONE_INDEX_NAME = os.getenv(
    "PINECONE_INDEX_NAME",
    "medical-rag-index",
)

# IMPORTANT:
# This must match the dimension configured for your Pinecone index.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = int(
    os.getenv("EMBEDDING_DIMENSION", "1024")
)

client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)

pc = (
    Pinecone(api_key=PINECONE_API_KEY)
    if PINECONE_API_KEY
    else None
)

index = (
    pc.Index(PINECONE_INDEX_NAME)
    if pc
    else None
)


# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

def validate_configuration():
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is missing from the environment.",
        )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PINECONE_API_KEY is missing from the environment.",
        )


# ============================================================
# GENERATE EMBEDDING
# ============================================================

async def generate_embedding(text: str) -> list:
    """
    Generate a Gemini text embedding without blocking
    the FastAPI event loop.
    """

    validate_configuration()

    if not isinstance(text, str) or not text.strip():
        raise ValueError("Embedding input must be a non-empty string.")

    response = await asyncio.to_thread(
        client.models.embed_content,
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION,
        ),
    )

    if not response.embeddings:
        raise ValueError("Gemini returned no embeddings.")

    values = response.embeddings[0].values

    if not values:
        raise ValueError("Gemini returned an empty embedding vector.")

    if len(values) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION} dimensions, "
            f"received {len(values)}."
        )

    return values


# ============================================================
# EMBED AND UPSERT DOCUMENT CHUNKS
# ============================================================

async def embed_and_upsert_chunks(chunks: list) -> dict:
    """
    Generate embeddings and store document chunks in Pinecone.
    """

    validate_configuration()

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text chunks provided for vectorization.",
        )

    vectors_to_upsert = []

    print("\n" + "=" * 60)
    print("📚 STARTING DOCUMENT EMBEDDING")
    print("🧠 Model:", EMBEDDING_MODEL)
    print("📐 Dimensions:", EMBEDDING_DIMENSION)
    print("📄 Total chunks:", len(chunks))
    print("=" * 60)

    for i, chunk in enumerate(chunks):
        try:
            page_content = chunk.get("pageContent")

            if not isinstance(page_content, str) or not page_content.strip():
                print(f"⚠️ Skipping empty chunk {i}")
                continue

            print(f"🔄 Embedding chunk {i + 1}/{len(chunks)}")

            embedding_values = await generate_embedding(page_content)

            metadata = chunk.get("metadata") or {}

            vector_id = f"chunk_{uuid.uuid4().hex}"

            vectors_to_upsert.append({
                "id": vector_id,
                "values": embedding_values,
                "metadata": {
                    "source": str(metadata.get("source", "unknown")),
                    "totalPages": int(metadata.get("totalPages", 0) or 0),
                    "chunkIndex": int(chunk.get("chunkIndex", i)),
                    "chunkLength": int(
                        metadata.get("chunkLength", len(page_content))
                    ),
                    "textSnippet": page_content[:1000],
                },
            })

            print(
                f"✅ Chunk {i} embedded "
                f"({len(embedding_values)} dimensions)"
            )

        except Exception as error:
            print(f"❌ Embedding failed for chunk {i}: {error}")
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    f"Failed to embed document chunk {i}: {str(error)}"
                ),
            ) from error

    if not vectors_to_upsert:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No embeddings generated; Pinecone upsert skipped.",
        )

    # --------------------------------------------------------
    # Verify Pinecone index dimensions before inserting.
    # --------------------------------------------------------

    try:
        description = await asyncio.to_thread(
            pc.describe_index,
            PINECONE_INDEX_NAME,
        )

        index_dimension = (
            description.dimension
            if hasattr(description, "dimension")
            else description.get("dimension")
        )

        if index_dimension != EMBEDDING_DIMENSION:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    f"Pinecone index dimension is {index_dimension}, "
                    f"but configured embedding dimension is "
                    f"{EMBEDDING_DIMENSION}. Set matching dimensions "
                    f"or create a correctly configured index."
                ),
            )

    except HTTPException:
        raise

    except Exception as error:
        print("❌ Could not validate Pinecone index dimensions:", error)
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not validate Pinecone index: {str(error)}",
        ) from error

    # --------------------------------------------------------
    # Upsert in batches
    # --------------------------------------------------------

    batch_size = 100

    for start in range(0, len(vectors_to_upsert), batch_size):
        batch = vectors_to_upsert[start:start + batch_size]

        try:
            print(
                f"⬆️ Upserting vectors {start + 1}-"
                f"{start + len(batch)}"
            )

            await asyncio.to_thread(
                index.upsert,
                vectors=batch,
            )

            print("✅ Batch upsert successful")

        except Exception as error:
            print("❌ Pinecone upsert failed:", error)
            traceback.print_exc()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Pinecone upsert failed: {str(error)}",
            ) from error

    print(f"🎉 Successfully upserted {len(vectors_to_upsert)} vectors")

    return {
        "success": True,
        "totalUpserted": len(vectors_to_upsert),
        "indexName": PINECONE_INDEX_NAME,
        "embeddingModel": EMBEDDING_MODEL,
        "embeddingDimension": EMBEDDING_DIMENSION,
    }


# ============================================================
# SEARCH RELEVANT CLINICAL CONTEXT
# ============================================================

async def search_relevant_context(
    query_text: str,
    top_k: int = 5,
) -> list:
    """
    Embed a patient query and retrieve relevant document chunks
    from Pinecone.
    """

    validate_configuration()

    if not isinstance(query_text, str) or not query_text.strip():
        return []

    try:
        print("\n🔎 STARTING CLINICAL VECTOR SEARCH")
        print("🧠 Embedding model:", EMBEDDING_MODEL)
        print("📝 Query length:", len(query_text))

        query_vector = await generate_embedding(query_text)

        print("📐 Query vector dimensions:", len(query_vector))

        search_result = await asyncio.to_thread(
            index.query,
            vector=query_vector,
            top_k=max(1, min(int(top_k), 20)),
            include_metadata=True,
        )

        retrieved_contexts = []

        for match in search_result.matches or []:
            metadata = match.metadata or {}
            snippet = metadata.get("textSnippet")

            if snippet:
                retrieved_contexts.append(str(snippet))

        print(
            f"✅ Retrieved {len(retrieved_contexts)} "
            "clinical context chunks"
        )

        return retrieved_contexts

    except HTTPException:
        raise

    except Exception as error:
        print("❌ VECTOR SEARCH FAILED")
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(error)}",
        ) from error
