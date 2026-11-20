import os
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY is missing in environment variables.")

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

def get_pinecone_index():
    """
    Returns the Pinecone index client instance.
    Defaults to 'medical-rag-index' if PINECONE_INDEX_NAME is not set.
    """
    index_name = os.getenv("PINECONE_INDEX_NAME", "medical-rag-index")
    return pc.Index(index_name)