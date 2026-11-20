import re

def clean_pdf_text(text: str) -> str:
    """
    Cleans raw extracted PDF text by removing excessive whitespace, 
    page numbers, headers, footers, and strange artifacts.
    """
    if not text:
        return ""

    # Replace multiple newlines or spaces with a single clean space/newline
    cleaned = re.sub(r'\r\n', '\n', text)
    
    # Remove page numbers like "Page 1 of 5" or "- 1 -"
    cleaned = re.sub(r'Page\s+\d+\s+of\s+\d+', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^\s*-\s*\d+\s*-\s*$', '', cleaned, flags=re.MULTILINE)

    # Remove excessive blank lines
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)

    # Strip leading/trailing whitespaces
    return cleaned.strip()